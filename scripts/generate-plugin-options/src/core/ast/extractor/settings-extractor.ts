import type { CallExpression, TypeChecker, Program, ObjectLiteralExpression } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty } from 'remeda';
import { findAllPropertyAssignments } from '../navigator/node-traversal.js';
import type { PluginSetting, PluginConfig } from '../../../shared/types.js';
import { extractSettingsFromPropertyIterable } from './settings-extractor-core.js';

/**
 * Read the payload passed into `definePluginSettings()`.
 *
 * The Equicord and Vencord builders often wrap the real call: `withPrivateSettings(definePluginSettings(...))`.
 * We only want the inner call because the wrapper arguments are generic constraints, not the giant settings object.
 * Passing the wrapper here means we stare at `<{ someType }>` and return `{}`, which in turn wipes every generated
 * Nix option for that plugin without throwing. Always feed the result of `findDefinePluginSettings()` into this
 * helper so chained helpers (withPrivateSettings, wrapPluginSettings, etc.) are already peeled off.
 */
export function extractSettingsFromCall(
  node: CallExpression | undefined,
  checker: TypeChecker,
  program: Program
): Record<string, PluginSetting | PluginConfig> {
  const settings: Record<string, PluginSetting | PluginConfig> = {};

  if (!node) {
    return settings;
  }

  const args = node.getArguments();
  if (isEmpty(args) || !args[0]) {
    return settings;
  }

  const arg = args[0];
  if (arg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return settings;
  }

  // Second argument is the runtime validation object (`{ disabled, isValid }`); it never influences
  // the DSL that becomes Nix, so skip it to keep the AST walk predictable

  const objLiteral = arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  // Navigator gives us a consistent iterable of property assignments even when the plugin mixes spreads,
  // computed keys, or nested objects; feed that into the shared extraction pipeline
  const propertyAssignments = findAllPropertyAssignments(objLiteral);
  return extractSettingsFromPropertyIterable(propertyAssignments, checker, program, true);
}

export function extractSettingsFromObject(
  obj: ObjectLiteralExpression,
  checker: TypeChecker,
  program: Program
): Record<string, PluginSetting | PluginConfig> {
  // Same navigator trick as above, but this version is used when we already have the literal expression
  const propertyAssignments = findAllPropertyAssignments(obj);
  return extractSettingsFromPropertyIterable(propertyAssignments, checker, program, false);
}
