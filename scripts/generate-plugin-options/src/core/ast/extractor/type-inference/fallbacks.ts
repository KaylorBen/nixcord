/**
 * Final fallbacks phase for type inference.
 *
 * Applies final conservative fallbacks for CUSTOM types with identifier defaults.
 */

import type { ObjectLiteralExpression } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { NIX_TYPE_ATTRS, NIX_TYPE_LIST_OF_ATTRS } from '../constants.js';
import { getDefaultPropertyInitializer } from '../type-helpers.js';
import { isCustomType } from '../type-helpers.js';
import type { InferenceState, SettingProperties } from './types.js';

/**
 * Applies final conservative fallbacks for CUSTOM types with identifier defaults.
 *
 * This runs last to make sure CUSTOM types with identifier defaults get treated as ATTRS
 * if we haven't already determined they're ATTRS or listOf attrs. This prevents them
 * from being incorrectly inferred as other types.
 */
export function applyFinalFallbacks(
  valueObj: ObjectLiteralExpression,
  props: SettingProperties,
  state: InferenceState
): InferenceState {
  const { finalNixType } = state;
  let newFinalNixType = finalNixType;

  // Last line of defense: CUSTOM settings with identifier defaults become attrs. This runs after
  // every other pass so nothing overwrites it
  if (finalNixType !== NIX_TYPE_ATTRS && finalNixType !== NIX_TYPE_LIST_OF_ATTRS) {
    const init = getDefaultPropertyInitializer(valueObj);

    // Always inspect identifier defaults; earlier passes might have replaced the default value
    if (init?.getKind() === SyntaxKind.Identifier && isCustomType(valueObj, props)) {
      // We can’t see the literal, so pick the safer ATTRS representation
      newFinalNixType = NIX_TYPE_ATTRS;
    }
  }

  return {
    ...state,
    finalNixType: newFinalNixType,
  };
}
