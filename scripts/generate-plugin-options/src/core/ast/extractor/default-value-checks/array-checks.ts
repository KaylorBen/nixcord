/**
 * Helpers for spotting array-shaped defaults. Equicord/Vencord plugins often stash select options
 * or component presets in arrays, so we need to know whether they're strings or objects even when
 * the literal sits behind an identifier.
 */

import type {
  TypeChecker,
  ObjectLiteralExpression,
  Node,
  ArrayLiteralExpression,
  AsExpression,
  Identifier,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty, every } from 'iter-tools';
import { match } from 'ts-pattern';
import { Maybe } from 'true-myth';
import { STRING_ARRAY_TYPE_PATTERN } from '../constants.js';
import { resolveIdentifierWithFallback, unwrapNode } from '../node-utils/index.js';
import { getDefaultPropertyInitializer } from '../type-helpers.js';
import { asKind } from '../../utils/node-helpers.js';

/**
 * Checks if an array literal contains only string literals.
 */
function isStringArray(arr: ArrayLiteralExpression): boolean {
  const elems = arr.getElements();
  return every((el: Node) => el.getKind() === SyntaxKind.StringLiteral, elems);
}

/**
 * Checks if an AsExpression represents a string array type.
 */
function isStringArrayAsExpression(asExpr: AsExpression): boolean {
  const expr = asExpr.getExpression();
  const typeNode = asExpr.getTypeNode();
  const isStringArrayType = !!typeNode && STRING_ARRAY_TYPE_PATTERN.test(typeNode.getText());
  return (
    isStringArrayType &&
    expr !== undefined &&
    asKind<ArrayLiteralExpression>(expr, SyntaxKind.ArrayLiteralExpression).isJust
  );
}

/**
 * Checks if a default value is a string array. Covers literals, `[] as string[]`, and identifiers
 * that eventually resolve to string arrays (e.g., constants defined next to the plugin).
 */
export function hasStringArrayDefault(obj: ObjectLiteralExpression): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init) return false;

  return match(init.getKind())
    .with(SyntaxKind.ArrayLiteralExpression, () => {
      const arr = asKind<ArrayLiteralExpression>(init, SyntaxKind.ArrayLiteralExpression).unwrapOr(
        undefined
      );
      return arr ? isStringArray(arr) : false;
    })
    .with(SyntaxKind.AsExpression, () => {
      const asExpr = asKind<AsExpression>(init, SyntaxKind.AsExpression).unwrapOr(undefined);
      return asExpr ? isStringArrayAsExpression(asExpr) : false;
    })
    .with(SyntaxKind.Identifier, () => {
      const ident = asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined);
      if (!ident) return false;

      const symbol = ident.getSymbol();
      let valueDecl = symbol?.getValueDeclaration();
      if (!valueDecl) {
        // Symbol lookup sometimes fails inside fixtures; fall back to scanning the same file
        const decl = ident.getSourceFile().getVariableDeclaration(ident.getText());
        valueDecl = decl ?? undefined;
      }
      const valueInit =
        valueDecl && 'getInitializer' in valueDecl
          ? (valueDecl as { getInitializer: () => Node | undefined }).getInitializer()
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
    .otherwise(() => false);
}

/**
 * Checks if a default value is an identifier that resolves to a string array.
 */
export function resolveIdentifierArrayDefault(obj: ObjectLiteralExpression): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init || init.getKind() !== SyntaxKind.Identifier) return false;
  const ident = init.asKindOrThrow(SyntaxKind.Identifier);
  // Ask the TypeScript checker for the initializer; if it fails (common in tests), fall back to
  // scanning the same file for a matching variable declaration
  const symbol = ident.getSymbol();
  const valueDecl = symbol?.getValueDeclaration();

  const valueInit = match(valueDecl)
    .when(
      (decl): decl is NonNullable<typeof decl> => decl !== undefined && 'getInitializer' in decl,
      (decl) => {
        const declWithInit = decl as unknown as {
          getInitializer: () => Node | undefined;
        };
        const init = declWithInit.getInitializer();
        return init !== undefined ? Maybe.just(init) : Maybe.nothing<Node>();
      }
    )
    .otherwise(() => {
      const decl = ident.getSourceFile().getVariableDeclaration(ident.getText());
      const init = decl?.getInitializer();
      return init !== undefined ? Maybe.just(init) : Maybe.nothing<Node>();
    });

  return valueInit
    .map((init) =>
      match(init.getKind())
        .with(SyntaxKind.ArrayLiteralExpression, () => {
          const arr = init.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
          return every((el: Node) => el.getKind() === SyntaxKind.StringLiteral, arr.getElements());
        })
        .with(SyntaxKind.AsExpression, () => {
          const asExpr = init.asKindOrThrow(SyntaxKind.AsExpression);
          const expr = asExpr.getExpression();
          const typeNode = asExpr.getTypeNode();
          const isStringArrayType =
            typeNode !== undefined && STRING_ARRAY_TYPE_PATTERN.test(typeNode.getText());
          return (
            isStringArrayType &&
            expr !== undefined &&
            expr.getKind() === SyntaxKind.ArrayLiteralExpression
          );
        })
        .otherwise(() => false)
    )
    .unwrapOr(false);
}

/**
 * Checks if an array contains objects.
 */
function checkArrayContainsObjects(arr: Node): boolean {
  const arrayExpr = asKind<ArrayLiteralExpression>(arr, SyntaxKind.ArrayLiteralExpression).unwrapOr(
    undefined
  );
  if (!arrayExpr) return false;

  const elems = arrayExpr.getElements();
  if (isEmpty(elems)) return false;

  return every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems);
}

function resolveFunctionBody(ident: Node): Maybe<Node> {
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

      // Prefer the function body defined on the declaration itself so we can inspect inline
      // arrow functions like `const buildDefaults = () => [{ ... }]`
      if (valueDecl) {
        const decl = valueDecl;
        const body = match(decl.getKind())
          .with(SyntaxKind.ArrowFunction, () =>
            Maybe.just(decl.asKindOrThrow(SyntaxKind.ArrowFunction).getBody())
          )
          .otherwise(() => {
            if ('getInitializer' in decl) {
              const valueInit = (
                decl as { getInitializer: () => Node | undefined }
              ).getInitializer();
              if (!valueInit) return Maybe.nothing<Node>();
              return match(valueInit.getKind())
                .with(SyntaxKind.ArrowFunction, () =>
                  Maybe.just(valueInit.asKindOrThrow(SyntaxKind.ArrowFunction).getBody())
                )
                .otherwise(() => Maybe.nothing<Node>());
            }
            return Maybe.nothing<Node>();
          });
        if (body.isJust) return body;
      }

      // If symbols don't point anywhere useful (typical in fixture-only tests), look up the
      // variable declaration manually and treat its initializer as the function body
      const decl = identifier.getSourceFile().getVariableDeclaration(identifier.getText());
      const valueInit = decl?.getInitializer();
      if (!valueInit) return Maybe.nothing<Node>();
      return match(valueInit.getKind())
        .with(SyntaxKind.ArrowFunction, () =>
          Maybe.just(valueInit.asKindOrThrow(SyntaxKind.ArrowFunction).getBody())
        )
        .otherwise(() => Maybe.nothing<Node>());
    })
    .otherwise(() => Maybe.nothing<Node>());
}

/**
 * Checks if a default value resolves to an array of objects. Handles literal arrays, typed empty
 * arrays, helper functions like `makeEmptyRuleArray()`, and identifier references.
 */
export function hasObjectArrayDefault(obj: ObjectLiteralExpression, checker: TypeChecker): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init) return false;

  return match(init.getKind())
    .with(SyntaxKind.ArrayLiteralExpression, () => {
      const arr = asKind<ArrayLiteralExpression>(init, SyntaxKind.ArrayLiteralExpression).unwrapOr(
        undefined
      );
      if (!arr) return false;
      const elems = arr.getElements();
      return (
        !isEmpty(elems) &&
        every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems)
      );
    })
    .with(SyntaxKind.AsExpression, () => {
      const asExpr = asKind<AsExpression>(init, SyntaxKind.AsExpression).unwrapOr(undefined);
      if (!asExpr) return false;
      const expr = asExpr.getExpression();
      const typeNode = asExpr.getTypeNode();
      const isArrayType =
        !!typeNode &&
        (/\[\]$/.test(typeNode.getText()) || /\bArray<.+>\b/.test(typeNode.getText()));
      if (!isArrayType || expr === undefined) return false;
      const arr = asKind<ArrayLiteralExpression>(expr, SyntaxKind.ArrayLiteralExpression).unwrapOr(
        undefined
      );
      if (!arr) return false;
      const elems = arr.getElements();
      return (
        !isEmpty(elems) &&
        every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems)
      );
    })
    .with(SyntaxKind.CallExpression, () => {
      const callExpr = init.asKindOrThrow(SyntaxKind.CallExpression);
      const expression = callExpr.getExpression();
      const ident = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);
      if (!ident) return false;

      return resolveFunctionBody(ident)
        .map((body) => {
          const unwrapped = unwrapNode(body);
          const arr = asKind<ArrayLiteralExpression>(
            unwrapped,
            SyntaxKind.ArrayLiteralExpression
          ).unwrapOr(undefined);
          return arr ? checkArrayContainsObjects(unwrapped) : false;
        })
        .unwrapOr(false);
    })
    .with(SyntaxKind.Identifier, () => {
      const ident = asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined);
      if (!ident) return false;

      // Let the resolver chase aliases/imports; plenty of plugins re-export default arrays
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
          // Accept both explicit array annotations and `as const` patterns—the latter still
          // represent fixed arrays of objects even though there's no [] syntax
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
    .otherwise(() => false);
}
