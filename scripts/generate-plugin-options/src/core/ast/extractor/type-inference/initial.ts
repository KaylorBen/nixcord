/**
 * Initial type inference phase.
 *
 * Infers the initial type and enum values from the raw setting.
 * This is the first step in type inference.
 */

import type { TypeChecker, Program, ObjectLiteralExpression, Node } from 'ts-morph';
import { isEmpty, every } from 'iter-tools';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { tsTypeToNixType } from '../../parser.js';
import { extractSelectOptions } from '../select/index.js';
import {
  NIX_ENUM_TYPE,
  NIX_TYPE_BOOL,
  OPTION_TYPE_COMPONENT,
  OPTION_TYPE_CUSTOM,
  BOOLEAN_ENUM_LENGTH,
} from '../constants.js';
import {
  hasStringArrayDefault,
  resolveIdentifierArrayDefault,
} from '../default-value-checks/index.js';
import type { InferenceState, SettingProperties } from './types.js';

/**
 * Infers the initial type and enum values from the raw setting.
 *
 * Looks at the TypeScript type, extracts enum values from options if present,
 * and checks if it's a boolean enum (exactly two boolean values). Also detects
 * string arrays and whether this is a COMPONENT or CUSTOM type that might need
 * special handling later.
 */
export function inferInitialType(
  valueObj: ObjectLiteralExpression,
  props: SettingProperties,
  rawSetting: {
    type: Node | undefined;
    description: string | undefined;
    default: unknown;
    placeholder?: string | undefined;
    restartNeeded: boolean;
    hidden: boolean;
    options?: readonly (string | number | boolean)[] | undefined;
  },
  checker: TypeChecker,
  program: Program
): InferenceState {
  const { nixType, enumValues } = tsTypeToNixType(rawSetting, program, checker);
  const astEnumResult = extractSelectOptions(valueObj, checker);
  const astEnumLiterals = astEnumResult.isOk ? astEnumResult.value.values : [];
  const hasAstEnumValues = !isEmpty(astEnumLiterals);

  const derivedEnumValues =
    enumValues && !isEmpty(enumValues)
      ? enumValues
      : hasAstEnumValues
        ? astEnumLiterals
        : undefined;

  const BooleanSchema = z.boolean();
  const isBooleanEnum =
    derivedEnumValues !== undefined &&
    derivedEnumValues.length === BOOLEAN_ENUM_LENGTH &&
    every(
      (value: unknown): value is boolean => BooleanSchema.safeParse(value).success,
      derivedEnumValues
    ) &&
    new Set(derivedEnumValues).size === BOOLEAN_ENUM_LENGTH;

  let selectEnumValues = derivedEnumValues;
  let finalNixType = nixType;

  match([isBooleanEnum, hasAstEnumValues] as const)
    .with([true, P._], () => {
      finalNixType = NIX_TYPE_BOOL;
      selectEnumValues = undefined;
    })
    .with([false, true], () => {
      finalNixType = NIX_ENUM_TYPE;
    })
    .otherwise(() => {
      // Leave enum info alone when neither condition matches
    });

  // Capture whether the default is a string array up front; later passes need this to decide
  // between `listOf str` and attrs
  const hasStringArray = hasStringArrayDefault(valueObj);
  const hasIdentifierStringArray =
    props.defaultLiteralValue === undefined && resolveIdentifierArrayDefault(valueObj);

  // Track whether the setting was declared as COMPONENT/CUSTOM; the coercion step needs this
  // flag, especially when tsTypeToNixType failed to resolve the OptionType text
  const isComponentOrCustom =
    props.typeNode.isJust &&
    (() => {
      const t = props.typeNode.value.getText();
      return t.includes(OPTION_TYPE_COMPONENT) || t.includes(OPTION_TYPE_CUSTOM);
    })();

  return {
    finalNixType,
    selectEnumValues,
    defaultValue: props.defaultLiteralValue,
    hasStringArray,
    hasIdentifierStringArray,
    isComponentOrCustom,
  };
}
