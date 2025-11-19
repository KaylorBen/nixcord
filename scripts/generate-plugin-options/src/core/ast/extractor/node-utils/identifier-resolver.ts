/**
 * Identifier resolution utilities.
 *
 * Resolves identifiers to their initializer nodes.
 */

import type { TypeChecker, Node, Identifier } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { match, P } from 'ts-pattern';
import { Maybe } from 'true-myth';
import { find } from 'remeda';
import { asKind } from '../../utils/node-helpers.js';

/**
 * Resolves an identifier to its initializer node.
 *
 * Handles re-exports and plain const declarations.
 * Uses the TypeScript checker to resolve symbols.
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
 * Resolves an identifier with fallback to same-file lookup.
 *
 * Same as resolveIdentifierInitializerNode but with more fallbacks.
 * Starts with the checker, then tries same-file lookup when the symbol
 * table doesn't cooperate (common in tests or half-migrated branches).
 */
export function resolveIdentifierWithFallback(
  identifierNode: Node,
  checker: TypeChecker
): Node | undefined {
  const ident = asKind<Identifier>(identifierNode, SyntaxKind.Identifier).unwrapOr(undefined);
  if (!ident) {
    return undefined;
  }

  // Prefer the TypeScript checker to resolve identifiers (handles aliases and re-exports)
  const resolvedInit = resolveIdentifierInitializerNode(ident, checker);
  if (resolvedInit.isJust) {
    return resolvedInit.value;
  }

  // Unit tests sometimes skip project wiring, so fall back to scanning the same file
  const sourceFile = ident.getSourceFile();
  const identName = ident.getText();

  // `getVariableDeclaration` is cheap—try it before the brute-force search below.
  let valueDecl = sourceFile.getVariableDeclaration(identName);

  // As a last resort, walk all variable declarations in the source file
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
