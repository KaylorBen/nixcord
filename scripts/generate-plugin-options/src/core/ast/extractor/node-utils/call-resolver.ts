/**
 * Call expression resolution utilities.
 *
 * Resolves call expressions to their return values (arrow functions, method calls).
 */

import type {
  TypeChecker,
  Node,
  CallExpression,
  PropertyAccessExpression,
  Identifier,
  ObjectLiteralExpression,
  ArrowFunction,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { match, P } from 'ts-pattern';
import { Maybe } from 'true-myth';
import { asKind } from '../../utils/node-helpers.js';
import { unwrapNode } from './unwrapper.js';

/**
 * Resolves a call expression to its return value node.
 *
 * Handles arrow functions and method calls (obj.method()).
 * Returns the body of arrow functions when possible.
 */
export function resolveCallExpressionReturn(callExpr: Node, checker: TypeChecker): Maybe<Node> {
  const call = asKind<CallExpression>(callExpr, SyntaxKind.CallExpression).unwrapOr(undefined);
  if (!call) return Maybe.nothing<Node>();

  const expression = call.getExpression();
  return match(expression.getKind())
    .with(SyntaxKind.PropertyAccessExpression, () => {
      // Support `obj.method()` style calls by resolving the object first and then the property
      const propAccess = asKind<PropertyAccessExpression>(
        expression,
        SyntaxKind.PropertyAccessExpression
      ).unwrapOr(undefined);
      if (!propAccess) return Maybe.nothing<Node>();
      const baseExpr = propAccess.getExpression();
      const propName = propAccess.getName();

      const baseIdent = asKind<Identifier>(baseExpr, SyntaxKind.Identifier).unwrapOr(undefined);
      if (baseIdent) {
        const baseSymbol = baseIdent.getSymbol() ?? checker.getSymbolAtLocation(baseIdent);

        const baseDecl = match(baseSymbol)
          .with(P.nullish, () => null)
          .otherwise((s) => {
            const decl = s?.getValueDeclaration();
            if (decl) return decl;

            return match((s as any)?.getAliasedSymbol)
              .with(P.nullish, () => null)
              .otherwise(() => {
                try {
                  const aliased = (s as any).getAliasedSymbol();
                  return aliased?.getValueDeclaration?.() ?? null;
                } catch {
                  return null;
                }
              });
          });

        if (!baseDecl) return Maybe.nothing<Node>();

        const baseInit =
          'getInitializer' in baseDecl
            ? (baseDecl as { getInitializer: () => Node | undefined }).getInitializer()
            : undefined;

        const obj = baseInit
          ? asKind<ObjectLiteralExpression>(baseInit, SyntaxKind.ObjectLiteralExpression).unwrapOr(
              undefined
            )
          : undefined;
        if (obj) {
          const methodProp = obj.getProperty(propName);
          const propAssign =
            methodProp && methodProp.getKind() === SyntaxKind.PropertyAssignment
              ? methodProp.asKindOrThrow(SyntaxKind.PropertyAssignment)
              : undefined;
          if (propAssign) {
            const methodInit = propAssign.getInitializer();
            const arrowFunc =
              methodInit && methodInit.getKind() === SyntaxKind.ArrowFunction
                ? methodInit.asKindOrThrow(SyntaxKind.ArrowFunction)
                : undefined;
            if (arrowFunc) {
              const body = arrowFunc.getBody();
              return body ? Maybe.just(unwrapNode(body)) : Maybe.nothing<Node>();
            }
          }
        }
        return Maybe.nothing<Node>();
      }
      return Maybe.nothing<Node>();
    })
    .with(SyntaxKind.Identifier, () => {
      // Plain function calls (`func()`) go through the same pipeline but without the object lookup
      const ident = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);
      if (!ident) return Maybe.nothing<Node>();
      const symbol = ident.getSymbol() ?? checker.getSymbolAtLocation(ident);

      const valueDecl = match(symbol)
        .with(P.nullish, () => null)
        .otherwise((s) => {
          const decl = s?.getValueDeclaration();
          if (decl) return decl;

          return match((s as any)?.getAliasedSymbol)
            .with(P.nullish, () => null)
            .otherwise(() => {
              try {
                const aliased = (s as any).getAliasedSymbol();
                return aliased?.getValueDeclaration?.() ?? null;
              } catch {
                return null;
              }
            });
        });

      const fromValueDecl = match(valueDecl)
        .with(P.nullish, () => Maybe.nothing<Node>())
        .otherwise((decl) => {
          const arrowFunc =
            decl.getKind() === SyntaxKind.ArrowFunction
              ? decl.asKindOrThrow(SyntaxKind.ArrowFunction)
              : undefined;
          if (arrowFunc) {
            const body = arrowFunc.getBody();
            return body ? Maybe.just(unwrapNode(body)) : Maybe.nothing<Node>();
          }

          if (decl.getKind() === SyntaxKind.FunctionDeclaration) {
            // Function declarations often contain complex bodies we can't safely execute, so bail
            // unless it’s a trivially analyzable arrow function
            return Maybe.nothing<Node>();
          }

          const init =
            'getInitializer' in decl
              ? (decl as { getInitializer: () => Node | undefined }).getInitializer()
              : undefined;

          const initArrowFunc =
            init && init.getKind() === SyntaxKind.ArrowFunction
              ? init.asKindOrThrow(SyntaxKind.ArrowFunction)
              : undefined;
          if (initArrowFunc) {
            const body = initArrowFunc.getBody();
            return body ? Maybe.just(unwrapNode(body)) : Maybe.nothing<Node>();
          }
          return Maybe.nothing<Node>();
        });

      if (fromValueDecl.isJust) return fromValueDecl;

      // If TypeScript can't help (common in fixture-only tests), fall back to a same-file search
      const sourceFile = call.getSourceFile();
      const decl = sourceFile.getVariableDeclaration(ident.getText());
      const init = decl?.getInitializer();

      return match(init)
        .when(
          (i): i is ArrowFunction => i?.getKind() === SyntaxKind.ArrowFunction,
          (arrowFunc) => {
            const body = arrowFunc.getBody();
            return body ? Maybe.just(unwrapNode(body)) : Maybe.nothing<Node>();
          }
        )
        .otherwise(() => Maybe.nothing<Node>());
    })
    .otherwise(() => Maybe.nothing<Node>());
}
