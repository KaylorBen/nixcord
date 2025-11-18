import type { TypeChecker, ObjectLiteralExpression, Identifier, StringLiteral } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty } from 'remeda';
import { match, P } from 'ts-pattern';
import { getPropertyAssignment, asKind } from '../utils/node-helpers.js';
import { extractSelectDefault } from './select.js';
import { hasObjectArrayDefault, hasComponentProp } from './default-value-checks.js';
import {
  DEFAULT_PROPERTY,
  TYPE_PROPERTY,
  NIX_ENUM_TYPE,
  NIX_TYPE_BOOL,
  NIX_TYPE_STR,
  NIX_TYPE_ATTRS,
  NIX_TYPE_NULL_OR_STR,
  COMPONENT_PROPERTY,
  DESCRIPTION_PROPERTY,
  NAME_PROPERTY,
  RESTART_NEEDED_PROPERTY,
  HIDDEN_PROPERTY,
  PLACEHOLDER_PROPERTY,
} from './constants.js';
import { every } from 'iter-tools';
import type { Node } from 'ts-morph';
import { getDefaultPropertyInitializer, isCustomType } from './type-helpers.js';
import type { SettingProperties } from './type-inference.js';

function isBareComponentSetting(obj: ObjectLiteralExpression): boolean {
  const allowed = new Set([
    TYPE_PROPERTY,
    COMPONENT_PROPERTY,
    DESCRIPTION_PROPERTY,
    NAME_PROPERTY,
    RESTART_NEEDED_PROPERTY,
    HIDDEN_PROPERTY,
    PLACEHOLDER_PROPERTY,
  ]);

  const props = obj.getProperties();
  const hasOnlyAllowed = every((p: Node) => {
    const propAssign =
      p.getKind() === SyntaxKind.PropertyAssignment
        ? p.asKindOrThrow(SyntaxKind.PropertyAssignment)
        : undefined;
    const methodDecl =
      p.getKind() === SyntaxKind.MethodDeclaration
        ? p.asKindOrThrow(SyntaxKind.MethodDeclaration)
        : undefined;

    const nameNode = propAssign?.getNameNode() ?? methodDecl?.getNameNode();
    if (!nameNode) return true;

    const ident = asKind<Identifier>(nameNode, SyntaxKind.Identifier).unwrapOr(undefined);
    const str = ident
      ? undefined
      : asKind<StringLiteral>(nameNode, SyntaxKind.StringLiteral).unwrapOr(undefined);
    const key = ident?.getText().replace(/['"]/g, '') ?? str?.getLiteralValue();
    if (!key) return true;
    return allowed.has(key);
  }, props);
  const hasDefault = !!obj.getProperty(DEFAULT_PROPERTY);
  return hasOnlyAllowed && !hasDefault && hasComponentProp(obj);
}

export interface ResolvedDefaultValue {
  finalNixType: string;
  defaultValue: unknown;
}

export function resolveDefaultValue(
  valueObj: ObjectLiteralExpression,
  finalNixType: string,
  defaultLiteralValue: unknown,
  selectEnumValues: readonly (string | number | boolean)[] | undefined,
  checker: TypeChecker
): ResolvedDefaultValue {
  let defaultValue = defaultLiteralValue;
  let finalNixTypeWithNull = finalNixType;

  // Handle enum and boolean types with pattern matching
  match([finalNixType, defaultLiteralValue] as const)
    .with([P.union(NIX_ENUM_TYPE, NIX_TYPE_BOOL), undefined], () => {
      // Try to extract default from select options if no explicit default
      const selectDefaultResult = extractSelectDefault(valueObj, checker);
      if (selectDefaultResult.isOk && selectDefaultResult.value !== undefined) {
        defaultValue = selectDefaultResult.value;
      } else if (finalNixType === NIX_ENUM_TYPE && selectEnumValues && !isEmpty(selectEnumValues)) {
        // Fallback to first enum value for regular enums
        defaultValue = selectEnumValues[0];
      }
    })
    .with([P.union(NIX_ENUM_TYPE, NIX_TYPE_BOOL), P._], () => {
      // Use the explicit default value
      defaultValue = defaultLiteralValue;
    })
    .otherwise(() => {
      // Keep existing defaultValue for other types
    });

  // Optional strings without an explicit default become nullable with null default.
  // Exception: if it's a CUSTOM type with an identifier default, assume it's ATTRS instead.
  if (finalNixType === NIX_TYPE_STR && defaultValue === undefined) {
    const minimalProps: SettingProperties = {
      typeNode: { isJust: false } as any,
      description: undefined,
      placeholder: undefined,
      restartNeeded: false,
      hidden: { isJust: false } as any,
      defaultLiteralValue: undefined,
    };

    const init = getDefaultPropertyInitializer(valueObj);
    const customType = isCustomType(valueObj, minimalProps);

    const initIdent = init
      ? asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined)
      : undefined;
    if (initIdent && (customType || hasObjectArrayDefault(valueObj, checker))) {
      finalNixTypeWithNull = NIX_TYPE_ATTRS;
      defaultValue = {};
    } else {
      finalNixTypeWithNull = NIX_TYPE_NULL_OR_STR;
      defaultValue = null;
    }
  }
  // Nullable types without an explicit default get null. This makes sure types.nullOr
  // always has default = null in the generated Nix. This runs after the STR->nullOr
  // conversion above, and before other type-specific checks. We check both the original
  // and modified type in case it was already nullOr from type inference.
  //
  // Use defaultLiteralValue (not defaultValue) here. This is a common bug source.
  // defaultValue might have been changed by previous checks (e.g., the STR->nullOr
  // conversion above sets it to null). If we check defaultValue instead of
  // defaultLiteralValue, we'll think there's already a default and skip setting it
  // to null, which breaks nullable types.
  //
  // Example bug: Type is STR with no explicit default. STR->nullOr conversion sets
  // defaultValue = null and finalNixTypeWithNull = "nullOr str". If we check defaultValue
  // here, we see null and think there's already a default. We skip setting it, but the
  // type is now nullOr str which needs default = null. Generated Nix has nullOr str
  // type but no default, which is invalid.
  const isNullOrType = finalNixType.includes('nullOr') || finalNixTypeWithNull.includes('nullOr');
  if (isNullOrType && defaultLiteralValue === undefined) {
    defaultValue = null;
    if (finalNixType.includes('nullOr') && !finalNixTypeWithNull.includes('nullOr')) {
      finalNixTypeWithNull = finalNixType;
    }
  }
  // Booleans without an explicit default default to false.
  match([finalNixType, defaultValue] as const)
    .with([NIX_TYPE_BOOL, undefined], () => {
      defaultValue = false;
    })
    .otherwise(() => {
      // Keep existing defaultValue
    });
  // COMPONENT settings without defaults (including getters that return undefined) need
  // a default value (even if it's an empty object), otherwise they get filtered out during
  // Nix generation and disappear.
  //
  // During Nix generation, settings without defaults can get filtered out. For COMPONENT
  // types, this means entire plugin sections disappear from the generated Nix files.
  // This was a regression where customRpc.config and customTimestamps.formats were
  // missing because they had no default values.
  //
  // We always provide a default for ATTRS types, even if it's just an empty object {}.
  // This ensures the setting appears in the generated Nix, even if it's empty. The user
  // can still configure it, but at least it's visible.
  //
  // Edge cases: Getters return null (can't be statically evaluated). Identifiers and
  // function calls return {} (shape-only defaults). Bare component settings (just type +
  // component, no default) get {}.
  if (finalNixType === NIX_TYPE_ATTRS && defaultValue === undefined) {
    if (isBareComponentSetting(valueObj)) {
      defaultValue = {};
    } else {
      const defProp = getPropertyAssignment(valueObj, DEFAULT_PROPERTY).unwrapOr(undefined);
      const defPropNode = valueObj.getProperty(DEFAULT_PROPERTY);
      const propKind = defPropNode?.getKind();
      const init = defProp ? defProp.getInitializer() : undefined;
      const initKind = init?.getKind();

      defaultValue = match([propKind, initKind] as const)
        .with([SyntaxKind.PropertyAssignment, SyntaxKind.Identifier], () => ({}))
        .with([SyntaxKind.PropertyAssignment, SyntaxKind.CallExpression], () => ({}))
        .with([SyntaxKind.GetAccessor, P._], () => null)
        .otherwise(() => ({}));
    }
  }
  // Getters that were converted to nullable string types: if it's a CUSTOM type with
  // an identifier default, convert it back to ATTRS.
  if (finalNixType === NIX_TYPE_NULL_OR_STR && defaultValue === null) {
    const minimalProps: SettingProperties = {
      typeNode: { isJust: false } as any,
      description: undefined,
      placeholder: undefined,
      restartNeeded: false,
      hidden: { isJust: false } as any,
      defaultLiteralValue: undefined,
    };

    const init = getDefaultPropertyInitializer(valueObj);
    const customType = isCustomType(valueObj, minimalProps);

    const initIdent = init
      ? asKind<Identifier>(init, SyntaxKind.Identifier).unwrapOr(undefined)
      : undefined;
    if (initIdent && (customType || hasObjectArrayDefault(valueObj, checker))) {
      finalNixTypeWithNull = NIX_TYPE_ATTRS;
      defaultValue = {};
    } else {
      defaultValue = null;
    }
  }

  return { finalNixType: finalNixTypeWithNull, defaultValue };
}
