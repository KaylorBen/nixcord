import type {
  TypeChecker,
  Node,
  ObjectLiteralExpression,
  StringLiteral,
  PropertyAccessExpression,
  Identifier,
  AsExpression,
  NoSubstitutionTemplateLiteral,
  NumericLiteral,
  EnumMember,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Result } from 'true-myth';
import { match, P } from 'ts-pattern';
import type { EnumValueResult } from './types.js';
import { createExtractionError, ExtractionErrorKind } from './types.js';
import { asKind, getPropertyAssignment } from '../utils/node-helpers.js';

/**
 * Resolves an enum-like value from a TypeScript AST node.
 *
 * Handles literals, enum members, property access, and has a fallback for Discord's
 * ActivityType enum (which isn't available in the AST). Returns the resolved enum literal
 * (string, number, or boolean) on success, or an error if it can't be evaluated.
 */
export function resolveEnumLikeValue(
  valueInitializer: Node,
  checker: TypeChecker
): EnumValueResult {
  return (
    match(valueInitializer.getKind())
      // TypeScript wraps values in various expression types (as expressions, type assertions,
      // parentheses). We recursively unwrap them to get to the actual literal value underneath
      .with(SyntaxKind.AsExpression, () => {
        const inner = (valueInitializer as any).getExpression?.() as Node | undefined;
        return inner
          ? resolveEnumLikeValue(inner, checker)
          : Result.err(
              createExtractionError(
                ExtractionErrorKind.CannotEvaluate,
                'Cannot evaluate as expression: inner expression not found',
                valueInitializer
              )
            );
      })
      .with(SyntaxKind.TypeAssertionExpression, () => {
        const inner = (valueInitializer as any).getExpression?.() as Node | undefined;
        return inner
          ? resolveEnumLikeValue(inner, checker)
          : Result.err(
              createExtractionError(
                ExtractionErrorKind.CannotEvaluate,
                'Cannot evaluate type assertion: inner expression not found',
                valueInitializer
              )
            );
      })
      .with(SyntaxKind.ParenthesizedExpression, () => {
        const inner = (valueInitializer as any).getExpression?.() as Node | undefined;
        return inner
          ? resolveEnumLikeValue(inner, checker)
          : Result.err(
              createExtractionError(
                ExtractionErrorKind.CannotEvaluate,
                'Cannot evaluate parenthesized expression: inner expression not found',
                valueInitializer
              )
            );
      })
      .with(SyntaxKind.StringLiteral, () => {
        const str = asKind<StringLiteral>(valueInitializer, SyntaxKind.StringLiteral).unwrapOr(
          undefined
        );
        return str
          ? Result.ok(str.getLiteralValue())
          : Result.err(
              createExtractionError(
                ExtractionErrorKind.InvalidNodeType,
                'Expected StringLiteral',
                valueInitializer
              )
            );
      })
      .with(SyntaxKind.NoSubstitutionTemplateLiteral, () => {
        const template = asKind<NoSubstitutionTemplateLiteral>(
          valueInitializer,
          SyntaxKind.NoSubstitutionTemplateLiteral
        ).unwrapOr(undefined);
        return template
          ? Result.ok(template.getLiteralValue())
          : Result.err(
              createExtractionError(
                ExtractionErrorKind.InvalidNodeType,
                'Expected NoSubstitutionTemplateLiteral',
                valueInitializer
              )
            );
      })
      .with(SyntaxKind.TemplateExpression, () =>
        Result.err(
          createExtractionError(
            ExtractionErrorKind.CannotEvaluate,
            'Template expressions with substitutions cannot be statically evaluated',
            valueInitializer
          )
        )
      )
      .with(SyntaxKind.NumericLiteral, () => {
        const num = asKind<NumericLiteral>(valueInitializer, SyntaxKind.NumericLiteral).unwrapOr(
          undefined
        );
        return num
          ? Result.ok(num.getLiteralValue())
          : Result.err(
              createExtractionError(
                ExtractionErrorKind.InvalidNodeType,
                'Expected NumericLiteral',
                valueInitializer
              )
            );
      })
      .with(SyntaxKind.TrueKeyword, () => Result.ok(true))
      .with(SyntaxKind.FalseKeyword, () => Result.ok(false))
      .with(SyntaxKind.PropertyAccessExpression, () => {
        const expr = asKind<PropertyAccessExpression>(
          valueInitializer,
          SyntaxKind.PropertyAccessExpression
        ).unwrapOr(undefined);
        if (!expr) {
          return Result.err(
            createExtractionError(
              ExtractionErrorKind.InvalidNodeType,
              'Expected PropertyAccessExpression',
              valueInitializer
            )
          );
        }
        const symbol = expr.getSymbol() ?? checker.getSymbolAtLocation(expr);
        const valueDeclaration = symbol?.getValueDeclaration();

        const enumMember = valueDeclaration
          ? asKind<EnumMember>(valueDeclaration, SyntaxKind.EnumMember).unwrapOr(undefined)
          : undefined;
        if (enumMember) {
          try {
            const value = (enumMember as { getValue?: () => unknown }).getValue?.();
            const valueResult = match(value)
              .with(P.union(P.number, P.string), (val) => Result.ok(val))
              .otherwise(() => undefined);
            if (valueResult) return valueResult;
          } catch {
            // ignore
          }
          const init = enumMember.getInitializer();
          if (init) {
            const num = asKind<NumericLiteral>(init, SyntaxKind.NumericLiteral).unwrapOr(undefined);
            if (num) {
              return Result.ok(num.getLiteralValue());
            }
            const str = asKind<StringLiteral>(init, SyntaxKind.StringLiteral).unwrapOr(undefined);
            if (str) {
              return Result.ok(str.getLiteralValue());
            }
          }
        }

        // Resolve property access like themes.DarkPlus by finding the themes object
        // and pulling out the DarkPlus property value. Also handles nested access like
        // config.themes.DarkPlus
        const baseExpr = expr.getExpression();
        const baseIdent = asKind<Identifier>(baseExpr, SyntaxKind.Identifier).unwrapOr(undefined);
        if (baseIdent) {
          const baseSym = baseIdent.getSymbol() ?? checker.getSymbolAtLocation(baseIdent);
          let baseDecl = baseSym?.getValueDeclaration();
          if (!baseDecl && (baseSym as any)?.getAliasedSymbol) {
            try {
              const aliased = (baseSym as any).getAliasedSymbol();
              baseDecl = aliased?.getValueDeclaration?.();
            } catch {
              // ignore
            }
          }

          let baseInit: Node | undefined =
            baseDecl && 'getInitializer' in baseDecl
              ? (baseDecl as { getInitializer: () => Node | undefined }).getInitializer()
              : undefined;

          // TypeScript's "as const" assertion wraps the object literal in an AsExpression
          // We need to unwrap it to get the actual object literal so we can access its properties
          const asExpr = baseInit
            ? asKind<AsExpression>(baseInit, SyntaxKind.AsExpression).unwrapOr(undefined)
            : undefined;
          if (asExpr) {
            baseInit = (asExpr as any).getExpression?.() as Node | undefined;
          }

          const obj = baseInit
            ? asKind<ObjectLiteralExpression>(
                baseInit,
                SyntaxKind.ObjectLiteralExpression
              ).unwrapOr(undefined)
            : undefined;
          if (obj) {
            const memberName = expr.getName();
            const targetProp = getPropertyAssignment(obj, memberName).unwrapOr(undefined);
            if (targetProp) {
              const init = targetProp.getInitializer();
              if (init) {
                const resolved = resolveEnumLikeValue(init, checker);
                if (resolved.isOk) return resolved;
              }
            }
          }

          // If symbol resolution failed (common in test environments or when declarations
          // are in different files), try looking up the variable declaration in the same file
          if (!baseInit) {
            const sourceFile = baseIdent.getSourceFile();
            const decl = sourceFile.getVariableDeclaration(baseIdent.getText());
            const altInit = decl?.getInitializer();
            if (altInit) {
              let unwrappedInit: Node | undefined = altInit;
              const asExpr = asKind<AsExpression>(altInit, SyntaxKind.AsExpression).unwrapOr(
                undefined
              );
              if (asExpr) {
                const inner = (asExpr as any).getExpression?.() as Node | undefined;
                unwrappedInit = inner ?? altInit;
              }
              const obj = unwrappedInit
                ? asKind<ObjectLiteralExpression>(
                    unwrappedInit,
                    SyntaxKind.ObjectLiteralExpression
                  ).unwrapOr(undefined)
                : undefined;
              if (obj) {
                const memberName = expr.getName();
                const targetProp = getPropertyAssignment(obj, memberName).unwrapOr(undefined);
                if (targetProp) {
                  const init = targetProp.getInitializer();
                  if (init) {
                    const resolved = resolveEnumLikeValue(init, checker);
                    if (resolved.isOk) return resolved;
                  }
                }
              }
            }
          }
        }

        // Some Discord enums (like ActivityType) aren't available in the AST because they're
        // defined in external packages. We hardcode the mapping for these common cases
        // This is why we manually add Discord enum files in the parser's createProject function
        const enumObject = expr.getExpression().getText();
        const memberName = expr.getName();
        if (enumObject === 'ActivityType') {
          const activityMap: Record<string, number> = {
            PLAYING: 0,
            STREAMING: 1,
            LISTENING: 2,
            WATCHING: 3,
            CUSTOM: 4,
            COMPETING: 5,
          };
          const mapped = activityMap[memberName];
          if (mapped !== undefined) {
            return Result.ok(mapped);
          }
        }

        return Result.err(
          createExtractionError(
            ExtractionErrorKind.UnresolvableSymbol,
            `Cannot resolve property access: ${enumObject}.${memberName}`,
            valueInitializer,
            { enumObject, memberName }
          )
        );
      })
      .otherwise(() =>
        Result.err(
          createExtractionError(
            ExtractionErrorKind.InvalidNodeType,
            `Cannot resolve enum value from node kind: ${valueInitializer.getKindName()}`,
            valueInitializer
          )
        )
      )
  );
}
