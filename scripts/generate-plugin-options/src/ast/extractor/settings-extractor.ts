import type { CallExpression, TypeChecker, Program, ObjectLiteralExpression } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty, find } from 'remeda';
import { Maybe } from 'true-myth';
import { iteratePropertyAssignments, getPropertyName } from '../utils/node-helpers.js';
import type { PluginSetting, PluginConfig } from '../../types.js';
import {
  extractBooleanProperty,
  extractStringProperty,
  extractTypeProperty,
} from './properties.js';
import { extractDefaultValue } from './default-value.js';
import { extractSelectOptions } from './select.js';
import {
  HIDDEN_PROPERTY,
  TYPE_PROPERTY,
  DESCRIPTION_PROPERTY,
  NAME_PROPERTY,
  PLACEHOLDER_PROPERTY,
  RESTART_NEEDED_PROPERTY,
  RESTART_REQUIRED_SUFFIX,
} from './constants.js';
import { inferNixTypeAndEnumValues, type SettingProperties } from './type-inference.js';
import { resolveDefaultValue } from './default-value-resolution.js';

function extractSettingProperties(
  valueObj: ObjectLiteralExpression,
  checker: TypeChecker
): SettingProperties {
  const typeNode = extractTypeProperty(valueObj);
  const description = extractStringProperty(valueObj, DESCRIPTION_PROPERTY)
    .orElse(() => extractStringProperty(valueObj, NAME_PROPERTY))
    .unwrapOr(undefined);
  const placeholder = extractStringProperty(valueObj, PLACEHOLDER_PROPERTY).unwrapOr(undefined);
  const restartNeeded = extractBooleanProperty(valueObj, RESTART_NEEDED_PROPERTY).unwrapOr(false);
  const hidden = extractBooleanProperty(valueObj, HIDDEN_PROPERTY);
  const defaultResult = extractDefaultValue(valueObj, checker);
  const defaultLiteralValue = defaultResult.isOk ? defaultResult.value : undefined;
  return {
    typeNode,
    description,
    placeholder,
    restartNeeded,
    hidden,
    defaultLiteralValue,
  };
}

function buildPluginSetting(
  key: string,
  finalNixType: string,
  description: string | undefined,
  defaultValue: unknown,
  selectEnumValues: readonly (string | number | boolean)[] | undefined,
  enumLabels: Readonly<Record<string, string> & Partial<Record<number, string>>> | undefined,
  placeholder: string | undefined,
  hidden: ReturnType<typeof extractBooleanProperty>,
  restartNeeded: boolean
): PluginSetting {
  return {
    name: key,
    type: finalNixType,
    description: description
      ? restartNeeded
        ? `${description} ${RESTART_REQUIRED_SUFFIX}`
        : description
      : undefined,
    default: defaultValue,
    enumValues: selectEnumValues && !isEmpty(selectEnumValues) ? selectEnumValues : undefined,
    enumLabels: enumLabels && !isEmpty(Object.keys(enumLabels)) ? enumLabels : undefined,
    example: placeholder ?? undefined,
    hidden: hidden.isJust ? hidden.value : undefined,
    restartNeeded,
  } as PluginSetting;
}

/**
 * Extracts plugin settings from a definePluginSettings call expression.
 *
 * Pass the inner call, not the chained call. This function expects the inner
 * `definePluginSettings()` CallExpression, NOT a chained call like `withPrivateSettings()`.
 * The settings object lives in `node.getArguments()[0]`.
 *
 * If you pass the outer chained call (e.g., `withPrivateSettings()`), this function will
 * try to read settings from `withPrivateSettings()`'s arguments, which are type parameters
 * (like `<{ someType }>`), not the settings object. This results in an empty settings
 * object, all plugin options disappearing from generated Nix files, and silent failure
 * (no error, just missing options).
 *
 * The bug is silent - you won't get an error, the function just returns an empty object.
 * You'll only notice when you check the generated Nix files and see that all plugin
 * settings are missing. This makes it very hard to debug.
 *
 * `findDefinePluginSettings()` carefully unwraps chained calls and returns the inner
 * CallExpression. Always use that function to find the call, don't search for it manually.
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

  // Note: We ignore the second argument (checks object) which contains disabled, isValid, etc.
  // These are runtime-only and don't affect the static structure we're extracting.

  const objLiteral = arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

  for (const propAssignment of iteratePropertyAssignments(objLiteral)) {
    const key = getPropertyName(propAssignment).unwrapOr(undefined);
    if (!key) continue;

    const init = propAssignment.getInitializer();
    const valueObj =
      init && init.getKind() === SyntaxKind.ObjectLiteralExpression
        ? Maybe.just(init as ObjectLiteralExpression)
        : Maybe.nothing();

    if (valueObj.isNothing) continue;
    const valueObjValue = valueObj.value;

    const nestedProperties = Array.from(iteratePropertyAssignments(valueObjValue));
    const hasTypeProperty =
      find(nestedProperties, (nestedProp) => {
        const nestedName = getPropertyName(nestedProp).unwrapOr('');
        return nestedName === TYPE_PROPERTY || nestedName === DESCRIPTION_PROPERTY;
      }) !== undefined;

    const hasNestedSettings =
      find(nestedProperties, (nestedProp) => {
        const init = nestedProp.getInitializer();
        return init?.getKind() === SyntaxKind.ObjectLiteralExpression;
      }) !== undefined;

    if (hasNestedSettings && !hasTypeProperty) {
      const nestedSettings = extractSettingsFromObject(valueObjValue, checker, program);
      settings[key] = {
        name: key,
        settings: nestedSettings as Record<string, PluginSetting | PluginConfig>,
      } as PluginConfig;
    } else {
      const props = extractSettingProperties(valueObjValue, checker);
      if (props.hidden.isJust && props.hidden.value) continue;

      const optionsResult = extractSelectOptions(valueObjValue, checker);
      const extractedOptions = optionsResult.isOk ? optionsResult.value.values : undefined;
      const extractedLabels = optionsResult.isOk ? optionsResult.value.labels : undefined;

      const rawSetting = {
        type: props.typeNode.unwrapOr(undefined),
        description: props.description,
        default: props.defaultLiteralValue,
        placeholder: props.placeholder,
        restartNeeded: props.restartNeeded,
        hidden: props.hidden.unwrapOr(false),
        options: extractedOptions,
      };

      const {
        finalNixType,
        selectEnumValues,
        defaultValue: inferredDefault,
      } = inferNixTypeAndEnumValues(valueObjValue, props, rawSetting, checker, program);

      const { finalNixType: resolvedNixType, defaultValue } = resolveDefaultValue(
        valueObjValue,
        finalNixType,
        inferredDefault,
        selectEnumValues,
        checker
      );

      settings[key] = buildPluginSetting(
        key,
        resolvedNixType,
        props.description,
        defaultValue,
        selectEnumValues,
        extractedLabels,
        props.placeholder,
        props.hidden,
        props.restartNeeded
      );
    }
  }

  return settings;
}

export function extractSettingsFromObject(
  obj: ObjectLiteralExpression,
  checker: TypeChecker,
  program: Program
): Record<string, PluginSetting | PluginConfig> {
  const settings: Record<string, PluginSetting | PluginConfig> = {};

  for (const propAssignment of iteratePropertyAssignments(obj)) {
    const key = getPropertyName(propAssignment).unwrapOr(undefined);
    if (!key) continue;

    const init = propAssignment.getInitializer();
    const valueObj =
      init && init.getKind() === SyntaxKind.ObjectLiteralExpression
        ? Maybe.just(init as ObjectLiteralExpression)
        : Maybe.nothing();

    if (valueObj.isNothing) continue;
    const valueObjValue = valueObj.value;

    const hidden = extractBooleanProperty(valueObjValue, HIDDEN_PROPERTY);
    if (hidden.isJust && hidden.value) continue;

    const nestedProperties = Array.from(iteratePropertyAssignments(valueObjValue));
    const hasTypeProperty =
      find(nestedProperties, (nestedProp) => {
        const nestedName = getPropertyName(nestedProp).unwrapOr('');
        return nestedName === TYPE_PROPERTY || nestedName === DESCRIPTION_PROPERTY;
      }) !== undefined;

    const hasNestedSettings =
      find(nestedProperties, (nestedProp) => {
        const init = nestedProp.getInitializer();
        return init?.getKind() === SyntaxKind.ObjectLiteralExpression;
      }) !== undefined;

    if (hasNestedSettings && !hasTypeProperty) {
      const nestedSettings = extractSettingsFromObject(valueObjValue, checker, program);
      settings[key] = {
        name: key,
        settings: nestedSettings as Record<string, PluginSetting | PluginConfig>,
      } as PluginConfig;
    } else {
      const props = extractSettingProperties(valueObjValue, checker);
      if (props.hidden.isJust && props.hidden.value) continue;

      const optionsResult = extractSelectOptions(valueObjValue, checker);
      const extractedOptions = optionsResult.isOk ? optionsResult.value.values : undefined;
      const extractedLabels = optionsResult.isOk ? optionsResult.value.labels : undefined;

      const rawSetting = {
        type: props.typeNode.unwrapOr(undefined),
        description: props.description,
        default: props.defaultLiteralValue,
        restartNeeded: props.restartNeeded,
        hidden: props.hidden.unwrapOr(false),
        options: extractedOptions,
      };

      const {
        finalNixType,
        selectEnumValues,
        defaultValue: inferredDefault,
      } = inferNixTypeAndEnumValues(valueObjValue, props, rawSetting, checker, program);

      const { finalNixType: resolvedNixType, defaultValue } = resolveDefaultValue(
        valueObjValue,
        finalNixType,
        inferredDefault,
        selectEnumValues,
        checker
      );

      settings[key] = buildPluginSetting(
        key,
        resolvedNixType,
        props.description,
        defaultValue,
        selectEnumValues,
        extractedLabels,
        props.placeholder,
        props.hidden,
        props.restartNeeded
      );
    }
  }

  return settings;
}
