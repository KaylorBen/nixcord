/**
 * Shared machinery for taking a `definePluginSettings({ ... })` object and turning it into the
 * structured data the rest of the generator understands. Both the call-based and literal-based
 * entry points rely on this so we only need to keep the gnarly logic (hidden filtering, nested
 * sections, select parsing) in one place.
 */

import type { TypeChecker, Program, ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { find, keys } from 'remeda';
import { Maybe } from 'true-myth';
import type { ReadonlyDeep } from 'type-fest';
import { getPropertyName } from '../utils/node-helpers.js';
import { findAllPropertyAssignments } from '../navigator/node-traversal.js';
import type { PluginSetting, PluginConfig } from '../../../shared/types.js';
import {
  extractBooleanProperty,
  extractStringProperty,
  extractTypeProperty,
} from './properties.js';
import { extractDefaultValue } from './default-value.js';
import { extractSelectOptions } from './select/index.js';
import {
  TYPE_PROPERTY,
  DESCRIPTION_PROPERTY,
  HIDDEN_PROPERTY,
  NAME_PROPERTY,
  PLACEHOLDER_PROPERTY,
  RESTART_NEEDED_PROPERTY,
  RESTART_REQUIRED_SUFFIX,
} from './constants.js';
import { inferNixTypeAndEnumValues, type SettingProperties } from './type-inference/index.js';
import { resolveDefaultValue } from './default-value-resolution.js';
import { isEmpty } from 'remeda';

/**
 * Snapshot the raw metadata for a setting as it appears in the AST. This runs before we infer
 * Nix-specific details so we can keep the original TS annotations/descriptions around for later.
 */
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

/**
 * Take the scraped TS info plus inference results and spit out the final `PluginSetting` record
 * that the Nix generator expects.
 */
function buildPluginSetting(
  key: string,
  finalNixType: string,
  description: string | undefined,
  defaultValue: unknown,
  selectEnumValues: readonly (string | number | boolean)[] | undefined,
  enumLabels: ReadonlyDeep<Record<string, string> & Partial<Record<number, string>>> | undefined,
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
    enumLabels: enumLabels && !isEmpty(keys(enumLabels)) ? enumLabels : undefined,
    example: placeholder ?? undefined,
    hidden: hidden.isJust ? hidden.value : undefined,
    restartNeeded,
  } as PluginSetting;
}

/**
 * Walk property assignments, build nested configs when we detect objects, and skip anything marked
 * hidden. This is the heart of the extractor used by both entry points.
 */
export function extractSettingsFromPropertyIterable(
  properties: Iterable<PropertyAssignment>,
  checker: TypeChecker,
  program: Program,
  skipHiddenCheck: boolean = false
): Record<string, PluginSetting | PluginConfig> {
  const settings: Record<string, PluginSetting | PluginConfig> = {};

  for (const propAssignment of properties) {
    const key = getPropertyName(propAssignment).unwrapOr(undefined);
    if (!key) continue;

    const init = propAssignment.getInitializer();
    const valueObj =
      init && init.getKind() === SyntaxKind.ObjectLiteralExpression
        ? Maybe.just(init as ObjectLiteralExpression)
        : Maybe.nothing();

    if (valueObj.isNothing) continue;
    const valueObjValue = valueObj.value;

    // `extractSettingsFromCall` already hides `hidden: true` entries in a later pass so we skip the
    // check for that caller only; literal extraction still needs to filter them right here
    if (!skipHiddenCheck) {
      const hidden = extractBooleanProperty(valueObjValue, HIDDEN_PROPERTY);
      if (hidden.isJust && hidden.value) continue;
    }

    // Navigator gives us a reliable stream of nested properties even when the plugin spreads other
    // objects in, so we lean on it before deciding whether this entry is a group or a leaf setting
    const nestedProperties = findAllPropertyAssignments(valueObjValue);
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
      const nestedSettings = extractSettingsFromPropertyIterable(
        nestedProperties,
        checker,
        program,
        false
      );
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
