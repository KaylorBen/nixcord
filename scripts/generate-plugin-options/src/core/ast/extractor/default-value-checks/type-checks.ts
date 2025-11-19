/**
 * Type-aware helpers for defaults. These figure out whether an object literal points at a
 * component, or whether empty arrays are actually typed placeholders.
 */

import type { ObjectLiteralExpression, Node } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty, every } from 'iter-tools';
import { match } from 'ts-pattern';
import { Maybe } from 'true-myth';
import { COMPONENT_PROPERTY } from '../constants.js';
import { unwrapNode } from '../node-utils/index.js';
import { getDefaultPropertyInitializer } from '../type-helpers.js';
import { hasProperty } from '../../utils/node-helpers.js';

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

      // Prefer the body defined on the declaration so inline arrows like
      // `const makeEmptyRuleArray = () => []` can be inspected.
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

      // If the symbol API can't find it (happens in fixtures), scan the same file for a matching
      // variable declaration
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
 * Checks if an object literal has a component property.
 */
export function hasComponentProp(obj: ObjectLiteralExpression): boolean {
  return hasProperty(obj, COMPONENT_PROPERTY);
}

/**
 * Detect empty arrays that are only kept for type information. Handles both `[] as SomeType[]` and
 * helper functions that create empty arrays.
 */
export function hasEmptyArrayWithTypeAnnotation(obj: ObjectLiteralExpression): boolean {
  const init = getDefaultPropertyInitializer(obj);
  if (!init) return false;

  return match(init.getKind())
    .with(SyntaxKind.AsExpression, () => {
      const asExpr = init.asKindOrThrow(SyntaxKind.AsExpression);
      const expr = asExpr.getExpression();
      const typeNode = asExpr.getTypeNode();
      if (!typeNode || !expr || expr.getKind() !== SyntaxKind.ArrayLiteralExpression) return false;
      const arr = expr.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
      // Only treat typed empty arrays as placeholders when we can prove the type is an array
      const isArrayType =
        /\[\]$/.test(typeNode.getText()) || /\bArray<.+>\b/.test(typeNode.getText());
      return isArrayType && isEmpty(arr.getElements());
    })
    .with(SyntaxKind.CallExpression, () => {
      const callExpr = init.asKindOrThrow(SyntaxKind.CallExpression);
      const expression = callExpr.getExpression();
      if (expression.getKind() !== SyntaxKind.Identifier) return false;
      return resolveFunctionBody(expression)
        .map((body) => {
          const unwrapped = unwrapNode(body);
          if (unwrapped.getKind() !== SyntaxKind.ArrayLiteralExpression) return false;
          const arr = unwrapped.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
          // Some helpers return either `[]` or an array of objects; treat both as valid placeholders
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
        .unwrapOr(false);
    })
    .otherwise(() => false);
}
