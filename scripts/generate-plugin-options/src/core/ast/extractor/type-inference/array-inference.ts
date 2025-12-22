/**
 * Decide whether a setting should become `listOf str` or `listOf attrs` based on its default.
 * Many plugins describe multi-selects this way without declaring explicit OptionTypes.
 */

import type { Identifier, ObjectLiteralExpression, TypeChecker } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { asKind } from '../../utils/node-helpers.js';
import {
  NIX_TYPE_ATTRS,
  NIX_TYPE_LIST_OF_ATTRS,
  NIX_TYPE_LIST_OF_STR,
  NIX_TYPE_STR,
} from '../constants.js';
import {
  hasEmptyArrayWithTypeAnnotation,
  hasObjectArrayDefault,
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
  const { finalNixType, defaultValue, hasStringArray, hasIdentifierStringArray } = state;
  let newFinalNixType = finalNixType;
  let newDefaultValue = defaultValue;

  const hasStringArrayDefaultValue = hasStringArray || hasIdentifierStringArray;
  const hasObjectArray = hasObjectArrayDefault(valueObj, checker);

  // Any setting that ships a string array default should surface as listOf str
  if (
    (newFinalNixType === NIX_TYPE_STR || newFinalNixType === NIX_TYPE_ATTRS) &&
    hasStringArrayDefaultValue
  ) {
    newFinalNixType = NIX_TYPE_LIST_OF_STR;
    if (newDefaultValue === undefined) {
      newDefaultValue = [];
    }
  }

  // Arrays of objects (literal or typed) become `listOf attrs`. Identifier
  // defaults stay attrs unless we can see the literal, because static analysis
  // can't verify their contents safely
  if ((newFinalNixType === NIX_TYPE_ATTRS || newFinalNixType === NIX_TYPE_STR) && hasObjectArray) {
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
  // Plain empty array defaults (e.g., type: OptionType.STRING, default: [])
  // still represent a list of strings, even without annotations. Treat them as
  // listOf str to avoid invalid Nix, but only when we don't already know it's
  // an object array
  if (
    (newFinalNixType === NIX_TYPE_STR || newFinalNixType === NIX_TYPE_ATTRS) &&
    !hasStringArrayDefaultValue &&
    !hasObjectArray
  ) {
    const init = getDefaultPropertyInitializer(valueObj);
    const asArrayLiteral = (() => {
      if (!init) return null;
      if (init.getKind() === SyntaxKind.ArrayLiteralExpression) {
        return init.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
      }
      if (init.getKind() === SyntaxKind.AsExpression) {
        const expr = init.asKindOrThrow(SyntaxKind.AsExpression).getExpression();
        if (expr?.getKind() === SyntaxKind.ArrayLiteralExpression) {
          return expr.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
        }
      }
      return null;
    })();
    const isEmptyArrayLiteral = !!asArrayLiteral && asArrayLiteral.getElements().length === 0;
    if (isEmptyArrayLiteral) {
      newFinalNixType = NIX_TYPE_LIST_OF_STR;
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
