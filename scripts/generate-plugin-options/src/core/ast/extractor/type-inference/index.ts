/**
 * Type inference orchestrator.
 *
 * Infers the Nix type and enum values for a plugin setting.
 * Runs a multi-step pipeline where the order matters.
 */

import type { TypeChecker, Program, ObjectLiteralExpression, Node } from 'ts-morph';
import { inferInitialType } from './initial.js';
import { coerceComponentOrCustomTypes } from './component-coercion.js';
import { inferArrayTypes } from './array-inference.js';
import { applyFinalFallbacks } from './fallbacks.js';
import type { TypeInferenceResult, SettingProperties } from './types.js';

export type { SettingProperties, TypeInferenceResult } from './types.js';

/**
 * Infers the Nix type and enum values for a plugin setting.
 *
 * Runs a multi-step pipeline where the order matters:
 * 1. Initial type inference - establishes baseline from TypeScript types
 * 2. COMPONENT/CUSTOM coercion - runs before array inference
 * 3. Array type inference - runs after coercion
 * 4. Final fallbacks - runs last to catch edge cases
 *
 * If you change the order, COMPONENT types with string arrays can be inferred as ATTRS
 * instead of listOf str. CUSTOM types with identifier defaults can end up as STR instead
 * of ATTRS if fallbacks don't run last. String defaults in COMPONENT types can be lost
 * if coercion runs in the wrong order.
 */
export function inferNixTypeAndEnumValues(
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
): TypeInferenceResult {
  // Step 1: Read whatever the TS annotations and option arrays already tell us
  let state = inferInitialType(valueObj, props, rawSetting, checker, program);

  // Step 2: Normalize COMPONENT/CUSTOM types into attrs when they clearly represent objects
  // Do this before array inference so the list logic sees the right base type
  state = coerceComponentOrCustomTypes(valueObj, props, state, checker);

  // Step 3: If the default is an array, decide whether it's strings or objects
  // Needs the coerced type so COMPONENT + string arrays become `listOf str`
  state = inferArrayTypes(valueObj, props, state, checker);

  // Step 4: Apply last-ditch fallbacks (e.g., CUSTOM without defaults -> attrs) after all other
  // passes so nothing overwrites them
  state = applyFinalFallbacks(valueObj, props, state);

  return {
    finalNixType: state.finalNixType,
    selectEnumValues: state.selectEnumValues,
    defaultValue: state.defaultValue,
  };
}
