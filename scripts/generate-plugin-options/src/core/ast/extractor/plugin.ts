import type { SourceFile, TypeChecker, ObjectLiteralExpression } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty } from 'remeda';
import { asKind, extractStringLiteralValue } from '../utils/node-helpers.js';
import { NAME_PROPERTY, DESCRIPTION_PROPERTY } from './constants.js';
import type { ExtractedPluginInfo } from './types.js';
import { ExtractedPluginInfoSchema } from './types.js';
import { findDefinePluginCall } from '../navigator/plugin-navigator.js';

/**
 * Pull the `name`/`description` pair out of the first `definePlugin({ ... })` invocation.
 * Equicord/Vencord plugins usually keep those fields literal, so we only bother with string
 * literals. Any computed or missing fields just disappear, which mirrors how the downstream
 * Nix generator treats them. The heavy lifting (finding the right call expression) happens in
 * the navigator layer; this helper only cares about unpacking the object literal once we have it.
 */
export function extractPluginInfo(
  sourceFile: SourceFile,
  _checker: TypeChecker
): ExtractedPluginInfo {
  const definePluginCall = findDefinePluginCall(sourceFile);

  if (definePluginCall.isNothing) return {};

  const callExpr = definePluginCall.value;
  const args = callExpr.getArguments();
  if (isEmpty(args) || !args[0]) return {};

  const arg = args[0];
  const obj = asKind<ObjectLiteralExpression>(arg, SyntaxKind.ObjectLiteralExpression).unwrapOr(
    undefined
  );
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
