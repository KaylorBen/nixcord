import type {
  SourceFile,
  TypeChecker,
  CallExpression,
  Identifier,
  PropertyAccessExpression,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Maybe } from 'true-myth';
import { find, isEmpty } from 'remeda';
import { asKind, extractStringLiteralValue } from '../utils/node-helpers.js';
import {
  DEFINE_PLUGIN_FUNCTION_NAME,
  DEFINE_PLUGIN_SETTINGS_FUNCTION_NAME,
  NAME_PROPERTY,
  DESCRIPTION_PROPERTY,
} from './constants.js';
import type { ExtractedPluginInfo } from './types.js';
import { ExtractedPluginInfoSchema } from './types.js';

/**
 * Extracts plugin name and description from a definePlugin call.
 *
 * Looks for `definePlugin({ name: "...", description: "..." })` and pulls out the
 * name and description. Only works with string literals, not computed values. Returns
 * an empty object if no definePlugin call is found. Only extracts from the first call.
 */
export function extractPluginInfo(
  sourceFile: SourceFile,
  _checker: TypeChecker
): ExtractedPluginInfo {
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  const definePluginCall = find(callExpressions, (callExpr) => {
    const expression = callExpr.getExpression();
    const ident = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);
    return ident?.getText() === DEFINE_PLUGIN_FUNCTION_NAME;
  });

  if (!definePluginCall) return {};

  const args = definePluginCall.getArguments();
  if (isEmpty(args) || !args[0]) return {};

  const arg = args[0];
  const obj = asKind<import('ts-morph').ObjectLiteralExpression>(
    arg,
    SyntaxKind.ObjectLiteralExpression
  ).unwrapOr(undefined);
  if (!obj) return {};

  const pluginName = extractStringLiteralValue(obj, NAME_PROPERTY).unwrapOr(undefined);
  const pluginDescription = extractStringLiteralValue(obj, DESCRIPTION_PROPERTY).unwrapOr(
    undefined
  );

  const result = {
    ...(pluginName !== undefined && { name: pluginName }),
    ...(pluginDescription !== undefined && {
      description: pluginDescription,
    }),
  };

  return ExtractedPluginInfoSchema.parse(result);
}

/**
 * Finds the definePluginSettings call expression in a source file.
 *
 * Looks for `definePluginSettings({ ... })` calls, including chained calls like
 * `definePluginSettings({ ... }).withPrivateSettings<{...}>()`. Settings can be in
 * the main plugin file (index.tsx, index.ts) or a separate settings.ts file.
 *
 * **Important**: This must return the inner `definePluginSettings()` CallExpression,
 * not the outer chained call (e.g., `withPrivateSettings()`). The caller expects the
 * first argument of the returned CallExpression to be the settings object literal.
 *
 * If you return the outer call, `extractSettingsFromCall` will try to read settings
 * from `withPrivateSettings()`'s arguments (which are type parameters, not the settings),
 * which makes all plugin settings disappear.
 */
export function findDefinePluginSettings(sourceFile: SourceFile): Maybe<CallExpression> {
  const callExpressions = sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression
  ) as CallExpression[];

  for (const callExpr of callExpressions) {
    let expression = callExpr.getExpression();
    let targetCall: CallExpression | undefined = callExpr;

    // Unwrap chained calls like definePluginSettings({...}).withPrivateSettings<{...}>()
    // to find the original definePluginSettings call
    let propAccess = asKind<PropertyAccessExpression>(
      expression,
      SyntaxKind.PropertyAccessExpression
    ).unwrapOr(undefined);
    while (propAccess) {
      const propName = propAccess.getName();

      if (propName === 'withPrivateSettings') {
        expression = propAccess.getExpression();
        const innerCall = asKind<CallExpression>(expression, SyntaxKind.CallExpression).unwrapOr(
          undefined
        );
        if (innerCall) {
          targetCall = innerCall;
          expression = innerCall.getExpression();
          propAccess = asKind<PropertyAccessExpression>(
            expression,
            SyntaxKind.PropertyAccessExpression
          ).unwrapOr(undefined);
          continue;
        }
      }
      break;
    }

    const identifier = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);
    const found = identifier?.getText() === DEFINE_PLUGIN_SETTINGS_FUNCTION_NAME;

    if (found) {
      // Return the actual definePluginSettings call, not the outer chained call.
      // The settings object is in targetCall.getArguments()[0], not in the outer call.
      return Maybe.just(targetCall ?? callExpr);
    }
  }

  return Maybe.nothing();
}
