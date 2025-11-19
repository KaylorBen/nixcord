import type {
  TypeChecker,
  ObjectLiteralExpression,
  PropertyAccessExpression,
  Identifier,
  StringLiteral,
  AsExpression,
  CallExpression,
  NoSubstitutionTemplateLiteral,
  NumericLiteral,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Result } from 'true-myth';
import { pipe, reduce } from 'remeda';
import { match, P } from 'ts-pattern';
import { asKind, iteratePropertyAssignments } from '../utils/node-helpers.js';
import {
  unwrapNode,
  resolveIdentifierInitializerNode,
  resolveCallExpressionReturn,
} from './node-utils/index.js';
import { getPropertyInitializer } from '../utils/node-helpers.js';
import { DEFAULT_PROPERTY, GET_FUNCTION_NAME, PARSE_INT_RADIX } from './constants.js';
import { resolveEnumLikeValue } from './enum-resolver.js';
import type { DefaultValueResult } from './types.js';
import { createExtractionError, ExtractionErrorKind } from './types.js';

/**
 * Read whatever sits under `default:` in a setting definition and convert it into something the
 * Nix generator can digest. We only evaluate what can be proven statically: literals, enums, and
 * simple helpers. Calls/getters that execute real code devolve into "{}" or "[]", because running
 * user code during generation would be a security nightmare.
 */
export function extractDefaultValue(
  node: ObjectLiteralExpression,
  checker: TypeChecker
): DefaultValueResult {
  const initializer = getPropertyInitializer(node, DEFAULT_PROPERTY).unwrapOr(undefined);
  if (!initializer) {
    return Result.ok(undefined);
  }

  const unwrappedInitializer = unwrapNode(initializer);

  return match(unwrappedInitializer.getKind())
    .with(SyntaxKind.PropertyAccessExpression, () => {
      const expr = asKind<PropertyAccessExpression>(
        unwrappedInitializer,
        SyntaxKind.PropertyAccessExpression
      ).unwrapOr(undefined);
      if (!expr) return Result.ok(undefined);
      const expression = expr.getExpression();
      // `get default()` accessors are runtime-only; we treat them as “no default” to mirror
      // how both upstream projects fall back to nullable strings in that situation
      const ident = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);
      if (ident && ident.getText() === GET_FUNCTION_NAME) {
        return Result.ok(undefined);
      }
      const resolved = resolveEnumLikeValue(unwrappedInitializer, checker);
      return match(resolved)
        .with({ isOk: true }, (r) => Result.ok(r.value))
        .with({ isOk: false }, () => Result.ok(undefined))
        .exhaustive();
    })
    .with(SyntaxKind.StringLiteral, () => {
      const str = asKind<StringLiteral>(unwrappedInitializer, SyntaxKind.StringLiteral).unwrapOr(
        undefined
      );
      return str ? Result.ok(str.getLiteralValue()) : Result.ok(undefined);
    })
    .with(SyntaxKind.TemplateExpression, () => {
      // Template strings that splice in identifiers depend on runtime data (see Equicord status
      // plugins). Bail out so we don't accidentally emit half-resolved junk
      return Result.ok(undefined);
    })
    .with(SyntaxKind.NoSubstitutionTemplateLiteral, () => {
      const template = asKind<NoSubstitutionTemplateLiteral>(
        unwrappedInitializer,
        SyntaxKind.NoSubstitutionTemplateLiteral
      ).unwrapOr(undefined);
      return template ? Result.ok(template.getLiteralValue()) : Result.ok(undefined);
    })
    .with(SyntaxKind.AsExpression, () => {
      const asExpr = asKind<AsExpression>(unwrappedInitializer, SyntaxKind.AsExpression).unwrapOr(
        undefined
      );
      if (!asExpr) return Result.ok(undefined);
      const expr = unwrapNode(asExpr.getExpression());
      return match(expr.getKind())
        .with(SyntaxKind.ArrayLiteralExpression, () => Result.ok([]))
        .with(SyntaxKind.ObjectLiteralExpression, () => Result.ok({}))
        .with(SyntaxKind.StringLiteral, () => {
          const str = asKind<StringLiteral>(expr, SyntaxKind.StringLiteral).unwrapOr(undefined);
          return str ? Result.ok(str.getLiteralValue()) : Result.ok(undefined);
        })
        .with(SyntaxKind.NoSubstitutionTemplateLiteral, () => {
          const template = asKind<NoSubstitutionTemplateLiteral>(
            expr,
            SyntaxKind.NoSubstitutionTemplateLiteral
          ).unwrapOr(undefined);
          return template ? Result.ok(template.getLiteralValue()) : Result.ok(undefined);
        })
        .with(SyntaxKind.NumericLiteral, () => {
          const num = asKind<NumericLiteral>(expr, SyntaxKind.NumericLiteral).unwrapOr(undefined);
          if (!num) return Result.ok(undefined);
          const text = num.getLiteralValue();
          const parsed = parseFloat(text.toString());
          return Result.ok(
            Number.isInteger(parsed) ? parseInt(text.toString(), PARSE_INT_RADIX) : parsed
          );
        })
        .with(SyntaxKind.TrueKeyword, () => Result.ok(true))
        .with(SyntaxKind.FalseKeyword, () => Result.ok(false))
        .otherwise(() => Result.ok(undefined));
    })
    .with(SyntaxKind.BigIntLiteral, () => {
      // Convert `123n` into `"123"`; Nix has no native bigint but still needs the raw text
      const raw = unwrappedInitializer.getText();
      const trimmed = raw.toLowerCase().endsWith('n') ? raw.slice(0, -1) : raw;
      return Result.ok(trimmed);
    })
    .with(SyntaxKind.NumericLiteral, () => {
      const num = asKind<NumericLiteral>(unwrappedInitializer, SyntaxKind.NumericLiteral).unwrapOr(
        undefined
      );
      if (!num) return Result.ok(undefined);
      const text = num.getLiteralValue();
      const parsed = parseFloat(text.toString());
      return Result.ok(
        Number.isInteger(parsed) ? parseInt(text.toString(), PARSE_INT_RADIX) : parsed
      );
    })
    .with(SyntaxKind.TrueKeyword, () => Result.ok(true))
    .with(SyntaxKind.FalseKeyword, () => Result.ok(false))
    .with(SyntaxKind.NullKeyword, () => Result.ok(null))
    .with(SyntaxKind.UndefinedKeyword, () => Result.ok(null))
    .with(SyntaxKind.Identifier, () => {
      const identifier = unwrappedInitializer.asKind(SyntaxKind.Identifier);
      if (!identifier) {
        return Result.ok(undefined);
      }
      const identText = identifier.getText();
      if (identText === 'undefined') {
        return Result.ok(null);
      }
      try {
        const init = resolveIdentifierInitializerNode(identifier, checker);
        return init
          .map((node) => {
            const unwrapped = unwrapNode(node);
            return match(unwrapped.getKind())
              .when(
                (kind) => kind === SyntaxKind.Identifier && unwrapped.getText() === 'undefined',
                () => Result.ok(null)
              )
              .with(SyntaxKind.StringLiteral, () => {
                const str = asKind<StringLiteral>(unwrapped, SyntaxKind.StringLiteral).unwrapOr(
                  undefined
                );
                return str ? Result.ok(str.getLiteralValue()) : Result.ok(undefined);
              })
              .with(SyntaxKind.NoSubstitutionTemplateLiteral, () => {
                const template = asKind<NoSubstitutionTemplateLiteral>(
                  unwrapped,
                  SyntaxKind.NoSubstitutionTemplateLiteral
                ).unwrapOr(undefined);
                return template ? Result.ok(template.getLiteralValue()) : Result.ok(undefined);
              })
              .with(SyntaxKind.TemplateExpression, () => Result.ok(undefined))
              .with(SyntaxKind.NumericLiteral, () => {
                const num = asKind<NumericLiteral>(unwrapped, SyntaxKind.NumericLiteral).unwrapOr(
                  undefined
                );
                if (!num) return Result.ok(undefined);
                const text = num.getLiteralValue();
                const parsed = parseFloat(text.toString());
                return Result.ok(
                  Number.isInteger(parsed) ? parseInt(text.toString(), PARSE_INT_RADIX) : parsed
                );
              })
              .with(SyntaxKind.TrueKeyword, () => Result.ok(true))
              .with(SyntaxKind.FalseKeyword, () => Result.ok(false))
              .with(SyntaxKind.UndefinedKeyword, () => Result.ok(null))
              .with(SyntaxKind.NullKeyword, () => Result.ok(null))
              .with(SyntaxKind.ArrayLiteralExpression, () => Result.ok([]))
              .with(SyntaxKind.ObjectLiteralExpression, () => Result.ok({}))
              .otherwise(() => Result.ok(undefined));
          })
          .unwrapOr(Result.ok(undefined));
      } catch (error) {
        return Result.err(
          createExtractionError(
            ExtractionErrorKind.CannotEvaluate,
            `Error resolving identifier ${identText}: ${error instanceof Error ? error.message : String(error)}`,
            identifier
          )
        );
      }
    })
    .with(SyntaxKind.ArrayLiteralExpression, () => Result.ok([]))
    .with(SyntaxKind.ObjectLiteralExpression, () => Result.ok({}))
    .with(SyntaxKind.CallExpression, () => {
      const callExpr = asKind<CallExpression>(
        unwrappedInitializer,
        SyntaxKind.CallExpression
      ).unwrapOr(undefined);
      if (!callExpr) return Result.ok(undefined);
      const args = callExpr.getArguments();
      // Helpers such as `defineDefault({ ... })` return literal objects; peel the first argument
      // apart and reuse that shape so nested settings keep their defaults
      const firstArg = args[0];
      const objLiteral = firstArg
        ? asKind<ObjectLiteralExpression>(firstArg, SyntaxKind.ObjectLiteralExpression).unwrapOr(
            undefined
          )
        : undefined;

      // Same as above—if the helper handed us an object literal, iterate its properties directly
      if (objLiteral) {
        const result = pipe(
          Array.from(iteratePropertyAssignments(objLiteral)),
          reduce(
            (result: Record<string, unknown>, propAssign) => {
              const propName = propAssign.getNameNode();
              const key = match(propName.getKind())
                .with(SyntaxKind.Identifier, SyntaxKind.StringLiteral, () =>
                  propName.getText().replace(/['"]/g, '')
                )
                .otherwise(() => undefined);

              return match([key, propAssign.getInitializer()] as const)
                .with([P.string, P.not(undefined)], ([k, propInitializer]) => {
                  const value = match(propInitializer.getKind())
                    .with(SyntaxKind.TrueKeyword, () => true)
                    .with(SyntaxKind.FalseKeyword, () => false)
                    .with(SyntaxKind.NumericLiteral, () => {
                      const num = asKind<NumericLiteral>(
                        propInitializer,
                        SyntaxKind.NumericLiteral
                      ).unwrapOr(undefined);
                      if (!num) return undefined;
                      const numValue = num.getLiteralValue();
                      const parsed = parseFloat(numValue.toString());
                      return Number.isInteger(parsed)
                        ? parseInt(numValue.toString(), PARSE_INT_RADIX)
                        : parsed;
                    })
                    .with(SyntaxKind.StringLiteral, () => {
                      const str = asKind<StringLiteral>(
                        propInitializer,
                        SyntaxKind.StringLiteral
                      ).unwrapOr(undefined);
                      return str ? str.getLiteralValue() : undefined;
                    })
                    .with(SyntaxKind.ObjectLiteralExpression, () => ({}))
                    .with(SyntaxKind.ArrayLiteralExpression, () => [])
                    .otherwise(() => undefined);

                  return match(value)
                    .with(undefined, () => result)
                    .otherwise((val) => ({ ...result, [k]: val }));
                })
                .otherwise(() => result);
            },
            {} as Record<string, unknown>
          )
        );
        return Result.ok(result);
      }

      // Last resort: resolve the call expression and hope it's an inline arrow that returns an
      // object/array literal. This covers factory-style defaults used in Vendicated's RPC plugins
      const resolved = resolveCallExpressionReturn(callExpr, checker);
      return resolved
        .map((node) =>
          match(node.getKind())
            .with(SyntaxKind.ArrayLiteralExpression, () => Result.ok([]))
            .with(SyntaxKind.ObjectLiteralExpression, () => Result.ok({}))
            .otherwise(() => Result.ok(undefined))
        )
        .unwrapOr(Result.ok(undefined));
    })
    .otherwise(() =>
      Result.err(
        createExtractionError(
          ExtractionErrorKind.CannotEvaluate,
          `Cannot evaluate default value from node kind: ${unwrappedInitializer.getKindName()}`,
          unwrappedInitializer
        )
      )
    );
}
