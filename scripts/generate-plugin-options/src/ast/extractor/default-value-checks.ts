import type {
  TypeChecker,
  ObjectLiteralExpression,
  Node,
  ArrayLiteralExpression,
  AsExpression,
  Identifier,
  CallExpression,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty, every, some } from 'iter-tools';
import { match } from 'ts-pattern';
import { STRING_ARRAY_TYPE_PATTERN, COMPONENT_PROPERTY } from './constants.js';
import { resolveIdentifierWithFallback, unwrapNode } from './node-utils.js';
import { getDefaultPropertyInitializer } from './type-helpers.js';
import { asKind, hasProperty } from '../utils/node-helpers.js';

function resolveFunctionBody(ident: Node): Node | undefined {
  return match(ident.getKind())
    .with(SyntaxKind.Identifier, () => {
      const identifier = ident.asKindOrThrow(SyntaxKind.Identifier);
      const symbol = identifier.getSymbol();
      let valueDecl = symbol?.getValueDeclaration();

      const aliasedDecl = match(symbol)
        .when(
          (s): s is NonNullable<typeof s> => !valueDecl && !!(s as any)?.getAliasedSymbol,
          (s) => {
            try {
              const aliased = (s as any).getAliasedSymbol();
              return aliased?.getValueDeclaration?.() ?? null;
            } catch {
              return null;
            }
          }
        )
        .otherwise(() => null);

      if (aliasedDecl) {
        valueDecl = aliasedDecl;
      }

      // Try to get body from valueDecl
      if (valueDecl) {
        const decl = valueDecl;
        const body = match(decl.getKind())
          .with(SyntaxKind.ArrowFunction, () =>
            decl.asKindOrThrow(SyntaxKind.ArrowFunction).getBody()
          )
          .otherwise(() => {
            if ('getInitializer' in decl) {
              const valueInit = (
                decl as { getInitializer: () => Node | undefined }
              ).getInitializer();
              if (!valueInit) return undefined;
              return match(valueInit.getKind())
                .with(SyntaxKind.ArrowFunction, () =>
                  valueInit.asKindOrThrow(SyntaxKind.ArrowFunction).getBody()
                )
                .otherwise(() => undefined);
            }
            return undefined;
          });
        if (body) return body;
      }

      // Fallback: look up variable declaration in the same source file
      const decl = identifier.getSourceFile().getVariableDeclaration(identifier.getText());
      const valueInit = decl?.getInitializer();
      if (!valueInit) return undefined;
      return match(valueInit.getKind())
        .with(SyntaxKind.ArrowFunction, () =>
          valueInit.asKindOrThrow(SyntaxKind.ArrowFunction).getBody()
        )
        .otherwise(() => undefined);
    })
    .otherwise(() => undefined);
}

/**
 * Checks if an array literal contains only string literals.
 */
function isStringArray(arr: import('ts-morph').ArrayLiteralExpression): boolean {
  const elems = arr.getElements();
  return every((el: Node) => el.getKind() === SyntaxKind.StringLiteral, elems);
}

/**
 * Checks if an AsExpression represents a string array type.
 */
function isStringArrayAsExpression(asExpr: import('ts-morph').AsExpression): boolean {
  const expr = asExpr.getExpression();
  const typeNode = asExpr.getTypeNode();
  const isStringArrayType = !!typeNode && STRING_ARRAY_TYPE_PATTERN.test(typeNode.getText());
  return (
    isStringArrayType &&
    expr !== undefined &&
    asKind<ArrayLiteralExpression>(expr, SyntaxKind.ArrayLiteralExpression).isJust
  );
}

export function hasStringArrayDefault(obj: ObjectLiteralExpression): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init) return false;

  return (
    match(init.getKind())
      // default: ["a","b"]
      .with(SyntaxKind.ArrayLiteralExpression, () => {
        const arr = asKind<ArrayLiteralExpression>(
          init,
          SyntaxKind.ArrayLiteralExpression
        ).unwrapOr(undefined);
        return arr ? isStringArray(arr) : false;
      })
      // default: [] as string[]
      .with(SyntaxKind.AsExpression, () => {
        const asExpr = asKind<AsExpression>(init, SyntaxKind.AsExpression).unwrapOr(undefined);
        return asExpr ? isStringArrayAsExpression(asExpr) : false;
      })
      // default: IDENTIFIER pointing to an array of string literals (or casted)
      .with(SyntaxKind.Identifier, () => {
        const ident = asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined);
        if (!ident) return false;

        const symbol = ident.getSymbol();
        let valueDecl = symbol?.getValueDeclaration();
        if (!valueDecl) {
          // Fallback: look up variable declaration in the same source file
          const decl = ident.getSourceFile().getVariableDeclaration(ident.getText());
          valueDecl = decl ?? undefined;
        }
        const valueInit =
          valueDecl && 'getInitializer' in valueDecl
            ? (
                valueDecl as { getInitializer: () => import('ts-morph').Node | undefined }
              ).getInitializer()
            : undefined;
        if (!valueInit) return false;

        return match(valueInit.getKind())
          .with(SyntaxKind.ArrayLiteralExpression, () => {
            const arr = asKind<ArrayLiteralExpression>(
              valueInit,
              SyntaxKind.ArrayLiteralExpression
            ).unwrapOr(undefined);
            return arr ? isStringArray(arr) : false;
          })
          .with(SyntaxKind.AsExpression, () => {
            const asExpr = asKind<AsExpression>(valueInit, SyntaxKind.AsExpression).unwrapOr(
              undefined
            );
            return asExpr ? isStringArrayAsExpression(asExpr) : false;
          })
          .otherwise(() => false);
      })
      .otherwise(() => false)
  );
}

export function hasComponentProp(obj: ObjectLiteralExpression): boolean {
  return hasProperty(obj, COMPONENT_PROPERTY);
}

function checkArrayContainsObjects(arr: Node): boolean {
  const arrayExpr = asKind<ArrayLiteralExpression>(arr, SyntaxKind.ArrayLiteralExpression).unwrapOr(
    undefined
  );
  if (!arrayExpr) return false;

  const elems = arrayExpr.getElements();
  if (isEmpty(elems)) return false;

  return some((el: Node) => {
    return match(el.getKind())
      .with(SyntaxKind.ObjectLiteralExpression, () => true)
      .with(SyntaxKind.CallExpression, () => {
        const callExpr = asKind<CallExpression>(el, SyntaxKind.CallExpression).unwrapOr(undefined);
        if (!callExpr) return false;

        const callExpression = callExpr.getExpression();
        const ident = asKind<Identifier>(callExpression, SyntaxKind.Identifier).unwrapOr(undefined);
        if (!ident) return false;

        const body = resolveFunctionBody(ident);
        if (!body) return false;

        const unwrappedBody = unwrapNode(body);
        return unwrappedBody.getKind() === SyntaxKind.ObjectLiteralExpression;
      })
      .otherwise(() => false);
  }, elems);
}

export function hasObjectArrayDefault(obj: ObjectLiteralExpression, checker: TypeChecker): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init) return false;

  return (
    match(init.getKind())
      // default: [{...}, {...}]
      .with(SyntaxKind.ArrayLiteralExpression, () => {
        const arr = asKind<ArrayLiteralExpression>(
          init,
          SyntaxKind.ArrayLiteralExpression
        ).unwrapOr(undefined);
        if (!arr) return false;
        const elems = arr.getElements();
        return (
          !isEmpty(elems) &&
          every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems)
        );
      })
      // default: [] as SomeType[]
      .with(SyntaxKind.AsExpression, () => {
        const asExpr = asKind<AsExpression>(init, SyntaxKind.AsExpression).unwrapOr(undefined);
        if (!asExpr) return false;
        const expr = asExpr.getExpression();
        const typeNode = asExpr.getTypeNode();
        const isArrayType =
          !!typeNode &&
          (/\[\]$/.test(typeNode.getText()) || /\bArray<.+>\b/.test(typeNode.getText()));
        return (
          isArrayType &&
          expr !== undefined &&
          asKind<ArrayLiteralExpression>(expr, SyntaxKind.ArrayLiteralExpression).isJust
        );
      })
      // default: makeEmptyRuleArray() - function call that returns array
      .with(SyntaxKind.CallExpression, () => {
        const callExpr = asKind<CallExpression>(init, SyntaxKind.CallExpression).unwrapOr(
          undefined
        );
        if (!callExpr) return false;
        const expression = callExpr.getExpression();
        const ident = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);
        if (!ident) return false;

        const body = resolveFunctionBody(ident);
        if (!body) return false;

        const unwrapped = unwrapNode(body);
        const arr = asKind<ArrayLiteralExpression>(
          unwrapped,
          SyntaxKind.ArrayLiteralExpression
        ).unwrapOr(undefined);
        return arr ? checkArrayContainsObjects(unwrapped) : false;
      })
      // default: IDENTIFIER pointing to an array of objects
      .with(SyntaxKind.Identifier, () => {
        const ident = asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined);
        if (!ident) return false;

        // Use resolveIdentifierWithFallback for better identifier resolution
        // This uses the TypeScript checker and handles aliased symbols better
        const valueInit = resolveIdentifierWithFallback(ident, checker);
        if (!valueInit) return false;

        return match(valueInit.getKind())
          .with(SyntaxKind.ArrayLiteralExpression, () => {
            const arr = asKind<ArrayLiteralExpression>(
              valueInit,
              SyntaxKind.ArrayLiteralExpression
            ).unwrapOr(undefined);
            if (!arr) return false;
            const elems = arr.getElements();
            return (
              !isEmpty(elems) &&
              every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems)
            );
          })
          .with(SyntaxKind.AsExpression, () => {
            const asExpr = asKind<AsExpression>(valueInit, SyntaxKind.AsExpression).unwrapOr(
              undefined
            );
            if (!asExpr) return false;
            const expr = asExpr.getExpression();
            const typeNode = asExpr.getTypeNode();
            // Check for array type annotation OR 'as const' (which doesn't have array type syntax)
            const isArrayType =
              !!typeNode &&
              (/\[\]$/.test(typeNode.getText()) || /\bArray<.+>\b/.test(typeNode.getText()));
            const isAsConst = typeNode?.getText() === 'const';
            const arr = expr
              ? asKind<ArrayLiteralExpression>(expr, SyntaxKind.ArrayLiteralExpression).unwrapOr(
                  undefined
                )
              : undefined;
            if ((isArrayType || isAsConst) && arr) {
              const elems = arr.getElements();
              return (
                elems.length > 0 &&
                every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems)
              );
            }
            return false;
          })
          .otherwise(() => false);
      })
      .otherwise(() => false)
  );
}

export function hasEmptyArrayWithTypeAnnotation(obj: ObjectLiteralExpression): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init) return false;

  return (
    match(init.getKind())
      // default: [] as SomeType[]
      .with(SyntaxKind.AsExpression, () => {
        const asExpr = init.asKindOrThrow(SyntaxKind.AsExpression);
        const expr = asExpr.getExpression();
        const typeNode = asExpr.getTypeNode();
        if (!typeNode || !expr || expr.getKind() !== SyntaxKind.ArrayLiteralExpression)
          return false;
        const arr = expr.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
        // Check if it's an empty array with an array type annotation
        const isArrayType =
          /\[\]$/.test(typeNode.getText()) || /\bArray<.+>\b/.test(typeNode.getText());
        return isArrayType && isEmpty(arr.getElements());
      })
      // default: makeEmptyRuleArray() - function call that returns array
      .with(SyntaxKind.CallExpression, () => {
        const callExpr = init.asKindOrThrow(SyntaxKind.CallExpression);
        const expression = callExpr.getExpression();
        if (expression.getKind() !== SyntaxKind.Identifier) return false;
        const body = resolveFunctionBody(expression);
        if (!body) return false;
        const unwrapped = unwrapNode(body);
        if (unwrapped.getKind() !== SyntaxKind.ArrayLiteralExpression) return false;
        const arr = unwrapped.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
        // Check if function returns an empty array or an array with object elements
        const elems = arr.getElements();
        return (
          isEmpty(elems) ||
          every(
            (el: Node) =>
              el.getKind() === SyntaxKind.ObjectLiteralExpression ||
              el.getKind() === SyntaxKind.CallExpression,
            elems
          )
        );
      })
      .otherwise(() => false)
  );
}

export function resolveIdentifierArrayDefault(obj: ObjectLiteralExpression): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init || init.getKind() !== SyntaxKind.Identifier) return false;
  const ident = init.asKindOrThrow(SyntaxKind.Identifier);
  // Try symbol, then same-file lookup
  const symbol = ident.getSymbol();
  let valueInit: import('ts-morph').Node | undefined;
  const valueDecl = symbol?.getValueDeclaration();
  if (valueDecl && 'getInitializer' in valueDecl) {
    valueInit = (
      valueDecl as { getInitializer: () => import('ts-morph').Node | undefined }
    ).getInitializer();
  } else {
    const decl = ident.getSourceFile().getVariableDeclaration(ident.getText());
    valueInit = decl?.getInitializer();
  }
  if (!valueInit) return false;
  if (valueInit.getKind() === SyntaxKind.ArrayLiteralExpression) {
    const arr = valueInit.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
    return every((el: Node) => el.getKind() === SyntaxKind.StringLiteral, arr.getElements());
  }
  if (valueInit.getKind() === SyntaxKind.AsExpression) {
    const asExpr = valueInit.asKindOrThrow(SyntaxKind.AsExpression);
    const expr = asExpr.getExpression();
    const typeNode = asExpr.getTypeNode();
    const isStringArrayType = !!typeNode && STRING_ARRAY_TYPE_PATTERN.test(typeNode.getText());
    if (isStringArrayType && expr && expr.getKind() === SyntaxKind.ArrayLiteralExpression) {
      return true;
    }
  }
  return false;
}
