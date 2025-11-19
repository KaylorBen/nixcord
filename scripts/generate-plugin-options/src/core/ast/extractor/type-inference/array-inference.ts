/**
 * Decide whether a setting should become `listOf str` or `listOf attrs` based on its default.
 * Many plugins describe multi-selects this way without declaring explicit OptionTypes.
 */

import type { TypeChecker, ObjectLiteralExpression, Identifier } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { asKind } from '../../utils/node-helpers.js';
import {
  NIX_TYPE_STR,
  NIX_TYPE_ATTRS,
  NIX_TYPE_LIST_OF_STR,
  NIX_TYPE_LIST_OF_ATTRS,
} from '../constants.js';
import {
  hasObjectArrayDefault,
  hasEmptyArrayWithTypeAnnotation,
} from '../default-value-checks/index.js';
import { getDefaultPropertyInitializer } from '../type-helpers.js';
import { isCustomType } from '../type-helpers.js';
import type { InferenceState, SettingProperties } from './types.js';

/**
 * If we can prove the default is a string array, return `listOf str`; if it's an array of objects,
 * return `listOf attrs`. Identifier defaults are treated conservatively unless we can look through
 * them without executing code.
 */
export function inferArrayTypes(
  valueObj: ObjectLiteralExpression,
  props: SettingProperties,
  state: InferenceState,
  checker: TypeChecker
): InferenceState {
  const {
    finalNixType,
    defaultValue,
    hasStringArray,
    hasIdentifierStringArray,
    isComponentOrCustom,
  } = state;
  let newFinalNixType = finalNixType;
  let newDefaultValue = defaultValue;

  // COMPONENT/CUSTOM defaults that boil down to string arrays behave like multi-selects, so emit
  // `listOf str` even if they started life as attrs.
  if (finalNixType === NIX_TYPE_ATTRS && (hasStringArray || hasIdentifierStringArray)) {
    newFinalNixType = NIX_TYPE_LIST_OF_STR;
    if (newDefaultValue === undefined) {
      newDefaultValue = [];
    }
  }
  // Catch the case where the type never flipped to ATTRS but the data is still clearly a string
  // array (common when authors forget to set OptionType)
  if (
    (finalNixType === NIX_TYPE_STR || finalNixType === NIX_TYPE_ATTRS) &&
    isComponentOrCustom &&
    (hasStringArray || hasIdentifierStringArray)
  ) {
    newFinalNixType = NIX_TYPE_LIST_OF_STR;
    if (newDefaultValue === undefined) {
      newDefaultValue = [];
    }
  }
  // Arrays of objects (literal or typed) become `listOf attrs`. Identifier defaults stay attrs
  // unless we can see the literal, because static analysis can't verify their contents safely
  if (finalNixType === NIX_TYPE_ATTRS && hasObjectArrayDefault(valueObj, checker)) {
    const init = getDefaultPropertyInitializer(valueObj);
    // Only upgrade when we can see the literal array or its `as` expression right here
    const isIdentifierDefault = init
      ? asKind<Identifier>(init, SyntaxKind.Identifier).isJust
      : false;
    if (!isIdentifierDefault) {
      newFinalNixType = NIX_TYPE_LIST_OF_ATTRS;
      if (newDefaultValue === undefined) {
        newDefaultValue = [];
      }
    }
  }
  // Typed empty arrays (`[] as IgnoredActivity[]`) and helper functions that return arrays count
  // as `listOf attrs` for CUSTOM settings so the downstream schema exposes list semantics
  if (hasEmptyArrayWithTypeAnnotation(valueObj)) {
    if (isCustomType(valueObj, props)) {
      newFinalNixType = NIX_TYPE_LIST_OF_ATTRS;
      if (newDefaultValue === undefined) {
        newDefaultValue = [];
      }
    }
  }

  return {
    ...state,
    finalNixType: newFinalNixType,
    defaultValue: newDefaultValue,
  };
}
