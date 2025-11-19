/**
 * Component/Custom type coercion phase.
 *
 * Coerces COMPONENT/CUSTOM types to ATTRS when appropriate.
 * This is one of the trickiest parts of type inference.
 */

import type {
  TypeChecker,
  ObjectLiteralExpression,
  Node,
  ArrayLiteralExpression,
  AsExpression,
  Identifier,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { every } from 'iter-tools';
import { z } from 'zod';
import { asKind } from '../../utils/node-helpers.js';
import { resolveIdentifierWithFallback } from '../node-utils/index.js';
import {
  DEFAULT_PROPERTY,
  NIX_TYPE_STR,
  NIX_TYPE_ATTRS,
  NIX_TYPE_NULL_OR_STR,
} from '../constants.js';
import { hasObjectArrayDefault } from '../default-value-checks/index.js';
import {
  getDefaultPropertyInitializer,
  isCustomType,
  hasStringLiteralDefault,
} from '../type-helpers.js';
import type { InferenceState, SettingProperties } from './types.js';

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
 * COMPONENT and CUSTOM types represent complex objects in Vencord, but they can have
 * string defaults. The logic here figures out when to treat them as attrs (complex
 * objects) vs strings.
 */
export function coerceComponentOrCustomTypes(
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

  // Treat COMPONENT/CUSTOM settings as attrs only when the default smells like an object
  // Real plugins sometimes leave the default blank or provide `{}`—both cases should become
  // attrs. Theme pickers that ship literal strings must remain `types.str`, so we bail if we
  // ever see a string literal in the AST
  if (
    finalNixType === NIX_TYPE_STR &&
    isComponentOrCustom &&
    !hasStringLiteral &&
    !z.string().safeParse(defaultValue).success &&
    (defaultValue === undefined ||
      (z.object({}).catchall(z.unknown()).safeParse(defaultValue).success &&
        !Array.isArray(defaultValue)))
  ) {
    newFinalNixType = NIX_TYPE_ATTRS;
  }

  // If `tsTypeToNixType` chickened out and returned STR, try to recover based on the AST
  // (common when plugin authors forget to import `OptionType.COMPONENT`).
  if (newFinalNixType === NIX_TYPE_STR && defaultValue === undefined && !hasStringLiteral) {
    const init = getDefaultPropertyInitializer(valueObj);

    // Settings like Equicord's `customRPC.formats` point to identifiers that resolve to
    // arrays of objects; treat those as attrs even though the literal is hidden in another file
    const initIdent = init
      ? asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined)
      : undefined;
    if (initIdent && hasObjectArrayDefault(valueObj, checker)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    } else if (isComponentOrCustom) {
      // For COMPONENT/CUSTOM with undefined default, coerce to ATTRS
      // Exception: if it's a string array, we'll handle that in inferArrayTypes
      if (!hasStringArray && !hasIdentifierStringArray) {
        newFinalNixType = NIX_TYPE_ATTRS;
      }
    }
  }

  // If we have an identifier default that resolves to an array of objects, convert to ATTRS
  // This handles CUSTOM types with identifier defaults that resolve to arrays of objects
  const init = getDefaultPropertyInitializer(valueObj);
  const initIdent = init
    ? asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined)
    : undefined;
  if (initIdent && init) {
    if (checkIdentifierArrayOfObjects(init, checker)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    }

    // If resolver fails, fall back to checking the literal declaration for arrays of objects
    if (newFinalNixType !== NIX_TYPE_ATTRS && hasObjectArrayDefault(valueObj, checker)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    }

    // Still nothing? CUSTOM types with identifier defaults are safer as attrs than str
    if (newFinalNixType !== NIX_TYPE_ATTRS && isCustomType(valueObj, props)) {
      newFinalNixType = NIX_TYPE_ATTRS;
    }
  }

  // Getter defaults (`get default() { ... }`) run at runtime; expose them to users as nullable
  // strings instead of attrs so the generated module still lets them input text
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
      // Sometimes extractDefaultValue fails to unwrap the literal even though it exists
      // If the AST shows a string, trust it and go back to STR
      newFinalNixType = NIX_TYPE_STR;
    }
  }

  return {
    ...state,
    finalNixType: newFinalNixType,
    defaultValue: newDefaultValue,
  };
}
