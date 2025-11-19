/**
 * Theme-specific evaluation utilities.
 *
 * Handles Equicord's shiki plugin theme evaluation.
 */

import type {
  TypeChecker,
  Node,
  Identifier,
  ObjectLiteralExpression,
  CallExpression,
  StringLiteral,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { pipe, filter, map } from 'remeda';
import { match, P } from 'ts-pattern';
import { asKind, iteratePropertyAssignments } from '../../utils/node-helpers.js';
import { resolveIdentifierInitializerNode } from './identifier-resolver.js';

/**
 * Evaluates theme values from an identifier.
 *
 * Equicord's shiki plugin keeps theme URLs in a local object plus a helper called
 * `shikiRepoTheme`. This function extracts those theme URLs.
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
                      // Equicord's `shikiRepoTheme("DarkPlus")` helper builds raw GitHub URLs on
                      // the fly. Grab SHIKI_REPO and SHIKI_REPO_COMMIT from the same file so we
                      // can reconstruct the final URL statically
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
                      return match([calleeIdent, calleeIdent?.getText()] as const)
                        .with([P.not(P.nullish), 'shikiRepoTheme'], () => {
                          const arg0 = call.getArguments()[0];
                          const arg0Str = arg0
                            ? asKind<StringLiteral>(arg0, SyntaxKind.StringLiteral).unwrapOr(
                                undefined
                              )
                            : undefined;
                          return match(arg0Str)
                            .when(
                              (str): str is StringLiteral => str !== undefined,
                              (str) => {
                                const name = str.getLiteralValue();
                                const source = vinit.getSourceFile();
                                const findConstText = (constName: string): string | null => {
                                  const constVar = source.getVariableDeclaration(constName);
                                  const cint = constVar?.getInitializer();
                                  const cintStr = cint
                                    ? asKind<StringLiteral>(
                                        cint,
                                        SyntaxKind.StringLiteral
                                      ).unwrapOr(undefined)
                                    : undefined;
                                  return cintStr ? cintStr.getLiteralValue() : null;
                                };
                                const repo = findConstText('SHIKI_REPO');
                                const commit = findConstText('SHIKI_REPO_COMMIT');
                                return match([repo, commit] as const)
                                  .when(
                                    (pair): pair is [string, string] =>
                                      pair[0] !== null && pair[1] !== null,
                                    ([r, c]) =>
                                      `https://raw.githubusercontent.com/${r}/${c}/packages/tm-themes/themes/${name}.json`
                                  )
                                  .otherwise(() => null);
                              }
                            )
                            .otherwise(() => null);
                        })
                        .otherwise(() => null);
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
