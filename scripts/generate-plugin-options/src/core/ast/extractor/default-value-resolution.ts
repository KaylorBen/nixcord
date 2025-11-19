import type { TypeChecker, ObjectLiteralExpression, Identifier, StringLiteral } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isEmpty } from 'remeda';
import { match, P } from 'ts-pattern';
import { getPropertyAssignment, asKind } from '../utils/node-helpers.js';
import { extractSelectDefault } from './select/index.js';
import { hasObjectArrayDefault, hasComponentProp } from './default-value-checks/index.js';
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
import type { SettingProperties } from './type-inference/index.js';

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

  // Enums often hide their defaults in the options array, so peek there before falling back to
  // literal defaults. Boolean enums are treated as raw booleans rather than enum strings
  match([finalNixType, defaultLiteralValue] as const)
    .with([P.union(NIX_ENUM_TYPE, NIX_TYPE_BOOL), undefined], () => {
      // No literal default? Use the first option, which mirrors how plugins render their menus
      const selectDefaultResult = extractSelectDefault(valueObj, checker);
      defaultValue = selectDefaultResult.match({
        Ok: (value) => {
          if (value !== undefined) {
            return value;
          }
          // Still nothing—choose the first enum entry so the generated Nix has a concrete value
          if (finalNixType === NIX_ENUM_TYPE && selectEnumValues && !isEmpty(selectEnumValues)) {
            return selectEnumValues[0];
          }
          return undefined;
        },
        Err: () => {
          // Same deal for numeric enums
          if (finalNixType === NIX_ENUM_TYPE && selectEnumValues && !isEmpty(selectEnumValues)) {
            return selectEnumValues[0];
          }
          return undefined;
        },
      });
    })
    .with([P.union(NIX_ENUM_TYPE, NIX_TYPE_BOOL), P._], () => {
      // Respect explicit defaults; nothing clever needed here
      defaultValue = defaultLiteralValue;
    })
    .otherwise(() => {
      // Everything else keeps whatever default we already inferred
    });

  // Settings shaped like optional strings (common for token fields) get promoted to nullOr str
  // with a `null` default so Home Manager surfaces them properly. Custom components that point to
  // identifiers stay as attrs instead, because they represent nested objects
  match([finalNixType, defaultValue] as const)
    .with([NIX_TYPE_STR, undefined], () => {
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

      match([initIdent, customType || hasObjectArrayDefault(valueObj, checker)] as const)
        .with([P.not(undefined), true], () => {
          finalNixTypeWithNull = NIX_TYPE_ATTRS;
          defaultValue = {};
        })
        .otherwise(() => {
          finalNixTypeWithNull = NIX_TYPE_NULL_OR_STR;
          defaultValue = null;
        });
    })
    .otherwise(() => {
      // Leave values alone when the condition doesn't apply
    });
  // Every `types.nullOr ...` needs an explicit `default = null`. We look at the literal default
  // rather than the inferred one because earlier passes may have already set `defaultValue` to
  // null. The bug we fixed: Vencord settings that started as `type: STR` (no default) were later
  // promoted to `nullOr str` but skipped the default assignment, producing invalid Nix
  const isNullOrType = finalNixType.includes('nullOr') || finalNixTypeWithNull.includes('nullOr');
  match([isNullOrType, defaultLiteralValue] as const)
    .with([true, undefined], () => {
      defaultValue = null;
      if (finalNixType.includes('nullOr') && !finalNixTypeWithNull.includes('nullOr')) {
        finalNixTypeWithNull = finalNixType;
      }
    })
    .otherwise(() => {
      // Nothing to do when a nullable default already exists
    });
  // Mirror upstream behavior: `types.bool` without `default` should become `false`
  match([finalNixType, defaultValue] as const)
    .with([NIX_TYPE_BOOL, undefined], () => {
      defaultValue = false;
    })
    .otherwise(() => {
      // Leave prior defaults untouched when the condition fails
    });
  // COMPONENT/CUSTOM settings vanish from the generated module if they don't have a default
  // We force them to `{}` (or `null` for getters) so sections like `customRpc.config` always show
  // up even when the plugin authors rely on runtime initialization
  match([finalNixType, defaultValue, isBareComponentSetting(valueObj)] as const)
    .with([NIX_TYPE_ATTRS, undefined, true], () => {
      defaultValue = {};
    })
    .with([NIX_TYPE_ATTRS, undefined, false], () => {
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
    })
    .otherwise(() => {
      // Skip when we already supplied a concrete default in a previous pass
    });
  // If a getter default later morphed into `nullOr str`, but the plugin really references an
  // identifier containing an object, switch back to attrs. This keeps complex components usable
  match([finalNixType, defaultValue] as const)
    .with([NIX_TYPE_NULL_OR_STR, null], () => {
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

      match([initIdent, customType || hasObjectArrayDefault(valueObj, checker)] as const)
        .with([P.not(undefined), true], () => {
          finalNixTypeWithNull = NIX_TYPE_ATTRS;
          defaultValue = {};
        })
        .otherwise(() => {
          defaultValue = null;
        });
    })
    .otherwise(() => {
      // No change when the predicate fails
    });

  return { finalNixType: finalNixTypeWithNull, defaultValue };
}
