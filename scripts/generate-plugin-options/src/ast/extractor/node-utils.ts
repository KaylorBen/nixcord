import type {
  TypeChecker,
  Node,
  ObjectLiteralExpression,
  Identifier,
  CallExpression,
  PropertyAccessExpression,
  StringLiteral,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { pipe, filter, map, find } from 'remeda';
import { match, P } from 'ts-pattern';
import { Maybe } from 'true-myth';
import { asKind, iteratePropertyAssignments } from '../utils/node-helpers.js';

/**
 * Unwraps common wrapper expressions (as, parentheses, type assertions) to reach the underlying node.
 * Recursively unwraps nested wrappers until a non-wrapper node is found.
 *
 * @param n - The node to unwrap
 * @returns The unwrapped node, or the original node if it's not a wrapper
 */
export function unwrapNode(n: Node): Node {
  let current = n;
  let changed = true;

  // Iteratively unwrap until no more wrappers are found
  while (changed) {
    changed = false;
    const kind = current.getKind();

    const inner = match(kind)
      .with(
        SyntaxKind.AsExpression,
        SyntaxKind.ParenthesizedExpression,
        SyntaxKind.TypeAssertionExpression,
        () => (current as any).getExpression?.() as Node | undefined
      )
      .otherwise(() => undefined);

    if (inner) {
      current = inner;
      changed = true;
    }
  }

  return current;
}

/**
 * Resolves an identifier to its initializer node, if possible.
 * Handles local declarations and aliased symbols. Returns Maybe.nothing() if it can't resolve.
 *
 * @param identifierNode - The identifier node to resolve
 * @param checker - TypeScript type checker for resolving symbols
 * @returns A Maybe containing the initializer node if found
 */
export function resolveIdentifierInitializerNode(
  identifierNode: Node,
  checker: TypeChecker
): Maybe<Node> {
  return match(identifierNode.getKind())
    .with(SyntaxKind.Identifier, (): Maybe<Node> => {
      const identifier = asKind<Identifier>(identifierNode, SyntaxKind.Identifier).unwrapOr(
        undefined
      );
      if (!identifier) return Maybe.nothing<Node>();
      const symbol = identifier.getSymbol() ?? checker.getSymbolAtLocation(identifier);

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

      if (!valueDecl) return Maybe.nothing<Node>();

      const init =
        'getInitializer' in valueDecl
          ? (valueDecl as { getInitializer: () => Node | undefined }).getInitializer()
          : undefined;

      return init ? Maybe.just(init) : Maybe.nothing<Node>();
    })
    .otherwise((): Maybe<Node> => Maybe.nothing<Node>());
}

/**
 * Resolves a call expression to see what it returns, if possible.
 * Works for arrow functions with expression bodies and function declarations.
 * Also handles property access expressions like `obj.method()`.
 * Returns Maybe.nothing() if it can't resolve.
 *
 * @param callExpr - The call expression node to resolve
 * @param checker - TypeScript type checker for resolving symbols
 * @returns A Maybe containing the function body node if found
 */
export function resolveCallExpressionReturn(callExpr: Node, checker: TypeChecker): Maybe<Node> {
  const call = asKind<CallExpression>(callExpr, SyntaxKind.CallExpression).unwrapOr(undefined);
  if (!call) return Maybe.nothing<Node>();

  const expression = call.getExpression();
  return match(expression.getKind())
    .with(SyntaxKind.PropertyAccessExpression, () => {
      // Handle property access like obj.method()
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
      // Handle direct identifier calls like func()
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
            // For function declarations, we can only use the body if it's a single return statement
            // For now, return nothing as function bodies are too complex to statically evaluate
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

      // Fallback: try same-file lookup
      const sourceFile = call.getSourceFile();
      const decl = sourceFile.getVariableDeclaration(ident.getText());
      const init = decl?.getInitializer();

      return match(init)
        .when(
          (i): i is import('ts-morph').ArrowFunction => i?.getKind() === SyntaxKind.ArrowFunction,
          (arrowFunc) => {
            const body = arrowFunc.getBody();
            return body ? Maybe.just(unwrapNode(body)) : Maybe.nothing<Node>();
          }
        )
        .otherwise(() => Maybe.nothing<Node>());
    })
    .otherwise(() => Maybe.nothing<Node>());
}

/**
 * Resolves an identifier to its initializer node with comprehensive fallbacks.
 * First tries resolveIdentifierInitializerNode (uses TypeScript checker),
 * then falls back to same-file variable declaration lookup.
 * This is useful for test environments where symbol resolution might fail.
 *
 * @param identifierNode - The identifier node to resolve
 * @param checker - TypeScript type checker for resolving symbols
 * @returns The initializer node if found, undefined otherwise
 */
export function resolveIdentifierWithFallback(
  identifierNode: Node,
  checker: TypeChecker
): Node | undefined {
  const ident = asKind<Identifier>(identifierNode, SyntaxKind.Identifier).unwrapOr(undefined);
  if (!ident) {
    return undefined;
  }

  // First try: use TypeScript checker (handles aliased symbols)
  const resolvedInit = resolveIdentifierInitializerNode(ident, checker);
  if (resolvedInit.isJust) {
    return resolvedInit.value;
  }

  // Fallback: try same-file lookup (useful for test environments where symbol resolution might fail)
  const sourceFile = ident.getSourceFile();
  const identName = ident.getText();

  // Try getVariableDeclaration first (faster)
  let valueDecl = sourceFile.getVariableDeclaration(identName);

  // If that fails, search through all variable declarations in the file using Remeda
  if (!valueDecl) {
    const allVarDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
    valueDecl = find(allVarDecls, (decl) => {
      const nameNode = decl.getNameNode();
      return nameNode.getKind() === SyntaxKind.Identifier && nameNode.getText() === identName;
    });
  }

  return match(valueDecl)
    .when(
      (decl): decl is NonNullable<typeof decl> => decl !== undefined && 'getInitializer' in decl,
      (decl) => (decl as { getInitializer: () => Node | undefined }).getInitializer()
    )
    .otherwise(() => undefined);
}

/**
 * Evaluates a simple object of themes into string values if possible.
 * Designed for shiki theme option inference. Extracts theme values from object literals.
 * Handles string literals and shikiRepoTheme() calls. Requires SHIKI_REPO and SHIKI_REPO_COMMIT
 * constants in the same file. Returns empty array if it can't resolve.
 *
 * @param themesIdent - The identifier node pointing to the themes object
 * @param checker - TypeScript type checker for resolving symbols
 * @returns Array of theme URL strings, or empty array if cannot be evaluated
 */
export function evaluateThemesValues(themesIdent: Node, checker: TypeChecker): string[] {
  return match(themesIdent.getKind())
    .with(SyntaxKind.Identifier, () => {
      const init = resolveIdentifierInitializerNode(themesIdent, checker);
      return init
        .map((node) =>
          match(node.getKind())
            .with(SyntaxKind.ObjectLiteralExpression, () => {
              const obj = asKind<ObjectLiteralExpression>(
                node,
                SyntaxKind.ObjectLiteralExpression
              ).unwrapOr(undefined);
              if (!obj) return [];
              const values = pipe(
                Array.from(iteratePropertyAssignments(obj)),
                map((pa) => {
                  const vinit = pa.getInitializer();
                  if (!vinit) return null;

                  return match(vinit.getKind())
                    .with(SyntaxKind.StringLiteral, () => {
                      const str = asKind<StringLiteral>(vinit, SyntaxKind.StringLiteral).unwrapOr(
                        undefined
                      );
                      return str ? str.getLiteralValue() : null;
                    })
                    .with(SyntaxKind.CallExpression, () => {
                      // Handle shikiRepoTheme() calls which construct GitHub raw URLs
                      // We need to find SHIKI_REPO and SHIKI_REPO_COMMIT constants in the same file
                      // to build the full URL: https://raw.githubusercontent.com/{repo}/{commit}/packages/tm-themes/themes/{name}.json
                      const call = asKind<CallExpression>(
                        vinit,
                        SyntaxKind.CallExpression
                      ).unwrapOr(undefined);
                      if (!call) return null;
                      const callee = call.getExpression();
                      const calleeIdent = asKind<Identifier>(
                        callee,
                        SyntaxKind.Identifier
                      ).unwrapOr(undefined);
                      if (calleeIdent && calleeIdent.getText() === 'shikiRepoTheme') {
                        const arg0 = call.getArguments()[0];
                        const arg0Str = arg0
                          ? asKind<StringLiteral>(arg0, SyntaxKind.StringLiteral).unwrapOr(
                              undefined
                            )
                          : undefined;
                        if (arg0Str) {
                          const name = arg0Str.getLiteralValue();
                          const source = vinit.getSourceFile();
                          const findConstText = (constName: string): string | null => {
                            const constVar = source.getVariableDeclaration(constName);
                            const cint = constVar?.getInitializer();
                            const cintStr = cint
                              ? asKind<StringLiteral>(cint, SyntaxKind.StringLiteral).unwrapOr(
                                  undefined
                                )
                              : undefined;
                            return cintStr ? cintStr.getLiteralValue() : null;
                          };
                          const repo = findConstText('SHIKI_REPO');
                          const commit = findConstText('SHIKI_REPO_COMMIT');
                          return repo && commit
                            ? `https://raw.githubusercontent.com/${repo}/${commit}/packages/tm-themes/themes/${name}.json`
                            : null;
                        }
                        return null;
                      }
                      return null;
                    })
                    .otherwise(() => null);
                }),
                filter((val): val is string => val !== null)
              );
              return values;
            })
            .otherwise(() => [])
        )
        .unwrapOr([]);
    })
    .otherwise(() => []);
}
