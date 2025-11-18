import type {
  TypeChecker,
  Program,
  ObjectLiteralExpression,
  Node,
  ArrayLiteralExpression,
  AsExpression,
  Identifier,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty, every } from 'iter-tools';
import { match, P } from 'ts-pattern';
import { asKind } from '../utils/node-helpers.js';
import { tsTypeToNixType } from '../parser.js';
import { extractSelectOptions } from './select.js';
import { resolveIdentifierWithFallback } from './node-utils.js';
import {
  DEFAULT_PROPERTY,
  NIX_ENUM_TYPE,
  NIX_TYPE_BOOL,
  NIX_TYPE_STR,
  NIX_TYPE_ATTRS,
  NIX_TYPE_NULL_OR_STR,
  NIX_TYPE_LIST_OF_STR,
  NIX_TYPE_LIST_OF_ATTRS,
  OPTION_TYPE_COMPONENT,
  OPTION_TYPE_CUSTOM,
  BOOLEAN_ENUM_LENGTH,
} from './constants.js';
import {
  hasStringArrayDefault,
  hasObjectArrayDefault,
  hasEmptyArrayWithTypeAnnotation,
  resolveIdentifierArrayDefault,
} from './default-value-checks.js';
import {
  getDefaultPropertyInitializer,
  isCustomType,
  hasStringLiteralDefault,
} from './type-helpers.js';

export interface SettingProperties {
  typeNode: ReturnType<typeof import('./properties.js').extractTypeProperty>;
  description: string | undefined;
  placeholder: string | undefined;
  restartNeeded: boolean;
  hidden: ReturnType<typeof import('./properties.js').extractBooleanProperty>;
  defaultLiteralValue: unknown;
}

export interface TypeInferenceResult {
  finalNixType: string;
  selectEnumValues: readonly (string | number | boolean)[] | undefined;
  defaultValue: unknown;
}

interface InferenceState {
  finalNixType: string;
  selectEnumValues: readonly (string | number | boolean)[] | undefined;
  defaultValue: unknown;
  hasStringArray: boolean;
  hasIdentifierStringArray: boolean;
  isComponentOrCustom: boolean;
}

/**
 * Infers the initial type and enum values from the raw setting.
 *
 * This is the first step in type inference. It looks at the TypeScript type, extracts
 * enum values from options if present, and checks if it's a boolean enum (exactly two
 * boolean values). It also detects string arrays and whether this is a COMPONENT or
 * CUSTOM type that might need special handling later.
 */
function inferInitialType(
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

  const isBooleanEnum =
    derivedEnumValues !== undefined &&
    derivedEnumValues.length === BOOLEAN_ENUM_LENGTH &&
    every((value: unknown): value is boolean => typeof value === 'boolean', derivedEnumValues) &&
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
      // Keep existing values
    });

  // Check for string array defaults early (needed for coercion logic later)
  const hasStringArray = hasStringArrayDefault(valueObj);
  const hasIdentifierStringArray =
    props.defaultLiteralValue === undefined && resolveIdentifierArrayDefault(valueObj);

  // COMPONENT and CUSTOM types can have string defaults, but we want to treat them as attrs
  // in Nix since they represent complex objects. Only coerce if there's no simple string default.
  // Also check if the type node text includes COMPONENT or CUSTOM to handle cases where
  // tsTypeToNixType didn't properly resolve the type.
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

/**
 * Checks if an identifier default resolves to an array of objects.
 *
 * Handles both direct array literals and "as const" assertions that contain arrays
 * of object literals.
 */
function checkIdentifierArrayOfObjects(init: Node, checker: TypeChecker): boolean {
  const valueInit = resolveIdentifierWithFallback(init, checker);
  if (!valueInit) return false;

  const arr = asKind<ArrayLiteralExpression>(valueInit, SyntaxKind.ArrayLiteralExpression).unwrapOr(
    undefined
  );
  if (arr) {
    const elems = arr.getElements();
    return (
      elems.length > 0 &&
      every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems)
    );
  }

  const asExpr = asKind<AsExpression>(valueInit, SyntaxKind.AsExpression).unwrapOr(undefined);
  if (asExpr) {
    const expr = asExpr.getExpression();
    const typeNode = asExpr.getTypeNode();
    const isAsConst = typeNode?.getText() === 'const';
    const arr = expr
      ? asKind<ArrayLiteralExpression>(expr, SyntaxKind.ArrayLiteralExpression).unwrapOr(undefined)
      : undefined;
    if (isAsConst && arr) {
      const elems = arr.getElements();
      return (
        elems.length > 0 &&
        every((el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression, elems)
      );
    }
  }
  return false;
}

/**
 * Coerces COMPONENT/CUSTOM types to ATTRS when appropriate.
 *
 * This is one of the trickiest parts of type inference. COMPONENT and CUSTOM types
 * represent complex objects in Vencord, but they can have string defaults. The logic
 * here figures out when to treat them as attrs (complex objects) vs strings.
 *
 * The core problem: COMPONENT types can have string defaults (like theme names), but
 * they also represent complex objects. We need to distinguish between COMPONENT with
 * a string default that should stay as types.str, and COMPONENT with no default or an
 * object default that should become types.attrs.
 *
 * If we coerce too aggressively, we lose string types for COMPONENT settings that
 * should be strings (like theme selectors). If we don't coerce enough, COMPONENT
 * settings without defaults disappear from the generated Nix because they get filtered
 * out. The fallback chain has multiple layers because tsTypeToNixType sometimes fails
 * to properly identify COMPONENT/CUSTOM types, so we have to detect them from the AST.
 *
 * Edge cases: Getters (get default() { ... }) can't be statically evaluated, so we
 * convert them to nullOr str instead of attrs. String arrays in COMPONENT types are
 * handled separately in inferArrayTypes. Identifier defaults that resolve to arrays
 * of objects need special handling.
 */
function coerceComponentOrCustomTypes(
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

  const hasStringLiteral = hasStringLiteralDefault(valueObj);

  // Only coerce COMPONENT/CUSTOM to ATTRS if:
  // 1. defaultValue is undefined (no explicit default), OR
  // 2. defaultValue is an object (but not an array or string)
  //
  // This preserves string defaults for COMPONENT types (they should remain as types.str).
  // The check for `!hasStringLiteral` is critical - if there's a string literal in the
  // AST, we want to keep it as STR even if extractDefaultValue failed to extract it.
  //
  // Important: don't coerce if defaultValue is a string - COMPONENT with string defaults
  // should stay as types.str. This prevents theme selectors and similar settings from
  // being incorrectly converted to attrs.
  if (
    finalNixType === NIX_TYPE_STR &&
    isComponentOrCustom &&
    !hasStringLiteral &&
    typeof defaultValue !== 'string' &&
    (defaultValue === undefined ||
      (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)))
  ) {
    newFinalNixType = NIX_TYPE_ATTRS;
  }

  // Fallback: if tsTypeToNixType failed to resolve COMPONENT/CUSTOM and returned STR,
  // but we can detect COMPONENT/CUSTOM from the AST, coerce to ATTRS when appropriate.
  //
  // This happens when the type node text includes "COMPONENT" or "CUSTOM" but
  // tsTypeToNixType couldn't properly resolve it (maybe because of complex type
  // expressions or missing type information).
  //
  // We check for string arrays here because if it's a string array, we want
  // inferArrayTypes to handle it and convert it to listOf str, not ATTRS.
  if (newFinalNixType === NIX_TYPE_STR && defaultValue === undefined && !hasStringLiteral) {
    const init = getDefaultPropertyInitializer(valueObj);

    // Check if default is an identifier that resolves to an array of objects
    const initIdent = init
      ? asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined)
      : undefined;
    if (initIdent && hasObjectArrayDefault(valueObj, checker)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    } else if (isComponentOrCustom) {
      // For COMPONENT/CUSTOM with undefined default, coerce to ATTRS.
      // Exception: if it's a string array, we'll handle that in inferArrayTypes.
      // This prevents string arrays from being incorrectly coerced to ATTRS.
      if (!hasStringArray && !hasIdentifierStringArray) {
        newFinalNixType = NIX_TYPE_ATTRS;
      }
    }
  }

  // If we have an identifier default that resolves to an array of objects, convert to ATTRS.
  // This handles CUSTOM types with identifier defaults that resolve to arrays of objects.
  const init = getDefaultPropertyInitializer(valueObj);
  const initIdent = init
    ? asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined)
    : undefined;
  if (initIdent && init) {
    if (checkIdentifierArrayOfObjects(init, checker)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    }

    // Also try hasObjectArrayDefault as a fallback if direct resolution failed
    if (newFinalNixType !== NIX_TYPE_ATTRS && hasObjectArrayDefault(valueObj, checker)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    }

    // Conservative fallback: if we have a CUSTOM type with identifier default,
    // and we haven't already determined it's ATTRS, assume ATTRS.
    if (newFinalNixType !== NIX_TYPE_ATTRS && isCustomType(valueObj, props)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    }
  }

  // COMPONENT with a getter default (get default() { ... }) can't be statically evaluated.
  // Getters are runtime-only, so we can't extract a default value. We convert these to
  // nullOr str instead of attrs, because:
  // 1. We can't know what the getter returns at static analysis time
  // 2. nullOr str is safer than attrs for unknown types
  // 3. The getter might return a string, so we preserve that possibility
  //
  // This is a special case that overrides the ATTRS coercion above.
  if (newFinalNixType === NIX_TYPE_ATTRS) {
    const defPropNode = valueObj.getProperty(DEFAULT_PROPERTY);
    const getAccessor =
      defPropNode && defPropNode.getKind() === SyntaxKind.GetAccessor
        ? defPropNode.asKindOrThrow(SyntaxKind.GetAccessor)
        : undefined;
    if (getAccessor) {
      newFinalNixType = NIX_TYPE_NULL_OR_STR;
      if (newDefaultValue === undefined) {
        newDefaultValue = null;
      }
    } else if (isComponentOrCustom && hasStringLiteral) {
      // tsTypeToNixType returned ATTRS because extractDefaultValue failed to extract
      // the string literal (maybe it was in a complex expression). But we can see from
      // the AST that there's a string literal default, so we convert back to STR to
      // preserve the string type. This prevents string defaults from being lost.
      newFinalNixType = NIX_TYPE_STR;
    }
  }

  return {
    ...state,
    finalNixType: newFinalNixType,
    defaultValue: newDefaultValue,
  };
}

/**
 * Infers array types (listOf str, listOf attrs) from defaults.
 *
 * If the default is a string array, it becomes listOf str. If it's an array of objects,
 * it becomes listOf attrs. This handles both direct array literals and identifier defaults
 * that resolve to arrays.
 */
function inferArrayTypes(
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

  // Infer listOf str when default is a string array, even for COMPONENT/CUSTOM types
  if (finalNixType === NIX_TYPE_ATTRS && (hasStringArray || hasIdentifierStringArray)) {
    newFinalNixType = NIX_TYPE_LIST_OF_STR;
    if (newDefaultValue === undefined) {
      newDefaultValue = [];
    }
  }
  // Also handle identifier-resolved string array default for component/custom.
  // This is a fallback for when the type hasn't been coerced to ATTRS yet.
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
  // Infer listOf attrs when default is an array of objects or casted empty array.
  //
  // We're conservative with identifier defaults. If the default is an identifier
  // (like `default: someArray`), we can't be 100% sure what it resolves to at static
  // analysis time. Even if hasObjectArrayDefault says it's an array of objects,
  // there might be edge cases where it's not. So we keep identifier-resolved arrays
  // as attrs (the safer option) rather than listOf attrs.
  //
  // Direct array literals and "as const" expressions are safe because we can see
  // the actual structure in the AST.
  if (finalNixType === NIX_TYPE_ATTRS && hasObjectArrayDefault(valueObj, checker)) {
    const init = getDefaultPropertyInitializer(valueObj);
    // Only use listOf attrs for direct array literals or as expressions, not identifiers.
    // Identifier-resolved arrays are treated conservatively as attrs to avoid false positives.
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
  // Also check for empty arrays with type annotations (e.g., [] as IgnoredActivity[]) or
  // function calls that return arrays (e.g., makeEmptyRuleArray()). These should be
  // listOf attrs for CUSTOM types.
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

/**
 * Applies final conservative fallbacks for CUSTOM types with identifier defaults.
 *
 * This runs last to make sure CUSTOM types with identifier defaults get treated as ATTRS
 * if we haven't already determined they're ATTRS or listOf attrs. This prevents them
 * from being incorrectly inferred as other types.
 */
function applyFinalFallbacks(
  valueObj: ObjectLiteralExpression,
  props: SettingProperties,
  state: InferenceState
): InferenceState {
  const { finalNixType } = state;
  let newFinalNixType = finalNixType;

  // Final conservative fallback: if we have a CUSTOM type with identifier default,
  // and we haven't already determined it's ATTRS (or listOf attrs), assume ATTRS.
  // This runs last to make sure it can't be overridden by other checks.
  if (finalNixType !== NIX_TYPE_ATTRS && finalNixType !== NIX_TYPE_LIST_OF_ATTRS) {
    const init = getDefaultPropertyInitializer(valueObj);

    // Check identifier defaults regardless of defaultValue - it might be [] if identifier resolved to array
    if (init?.getKind() === SyntaxKind.Identifier && isCustomType(valueObj, props)) {
      // CUSTOM type with identifier default - assume ATTRS
      newFinalNixType = NIX_TYPE_ATTRS;
    }
  }

  return {
    ...state,
    finalNixType: newFinalNixType,
  };
}

/**
 * Infers the Nix type and enum values for a plugin setting.
 *
 * This runs a multi-step pipeline where the order matters. Each step depends on the
 * previous one's results.
 *
 * Initial type inference runs first to establish a baseline from TypeScript types.
 * COMPONENT/CUSTOM coercion runs before array inference - we need to know if something
 * is COMPONENT/CUSTOM before deciding if it's a listOf attrs. Array inference runs
 * after coercion because string arrays in COMPONENT types should become listOf str,
 * not stay as ATTRS. Final fallbacks run last to catch any CUSTOM types that slipped
 * through without being properly identified as ATTRS.
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
  // Step 1: Infer initial type and enum values
  let state = inferInitialType(valueObj, props, rawSetting, checker, program);

  // Step 2: Coerce COMPONENT/CUSTOM types to ATTRS when appropriate
  // Must run before array inference so we know what we're dealing with
  state = coerceComponentOrCustomTypes(valueObj, props, state, checker);

  // Step 3: Infer array types (listOf str, listOf attrs)
  // Must run after coercion so COMPONENT types with string arrays become listOf str
  state = inferArrayTypes(valueObj, props, state, checker);

  // Step 4: Apply final conservative fallbacks
  // Must run last so it can't be overridden by other checks
  state = applyFinalFallbacks(valueObj, props, state);

  return {
    finalNixType: state.finalNixType,
    selectEnumValues: state.selectEnumValues,
    defaultValue: state.defaultValue,
  };
}
