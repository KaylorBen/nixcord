import type { TypeChecker, Program, Node } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { pipe, map, filter, isEmpty } from 'remeda';
import { every } from 'iter-tools';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { Maybe } from 'true-myth';
import { OptionTypeMap } from '../../shared/types.js';
import {
  PARSE_INT_RADIX,
  NIX_ENUM_TYPE,
  NIX_TYPE_BOOL,
  NIX_TYPE_STR,
  NIX_TYPE_INT,
  NIX_TYPE_FLOAT,
  NIX_TYPE_ATTRS,
  OPTION_TYPE_BOOLEAN,
  OPTION_TYPE_STRING,
  OPTION_TYPE_NUMBER,
  OPTION_TYPE_BIGINT,
  OPTION_TYPE_SELECT,
  OPTION_TYPE_SLIDER,
  OPTION_TYPE_COMPONENT,
  OPTION_TYPE_CUSTOM,
  TS_TYPE_STRING,
  TS_TYPE_NUMBER,
  TS_TYPE_BOOLEAN,
  TS_ARRAY_BRACKET_PATTERN,
  TS_ARRAY_GENERIC_PATTERN,
  BOOLEAN_ENUM_LENGTH,
} from './extractor/constants.js';

const EnumValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const BooleanSchema = z.boolean();
const OptionItemSchema = z
  .object({
    value: EnumValueSchema.optional(),
  })
  .catchall(z.unknown());

const OptionsArraySchema = z.array(OptionItemSchema).nullable().optional();

const NodeSchema = z
  .object({
    getKind: z.function(),
  })
  .catchall(z.unknown());

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && NodeSchema.safeParse(value).success;
}

const ObjectValueSchema = z
  .object({})
  .catchall(z.unknown())
  .refine((val) => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'Must be a non-array object',
  });

function inferNixTypeFromRuntimeDefault(defaultValue: unknown): string {
  return match(defaultValue)
    .with(undefined, () => NIX_TYPE_STR)
    .with(P.boolean, () => NIX_TYPE_BOOL)
    .with(P.string, () => NIX_TYPE_STR)
    .with(P.number, (val) => (Number.isInteger(val) ? NIX_TYPE_INT : NIX_TYPE_FLOAT))
    .when(
      (val): val is object => ObjectValueSchema.safeParse(val).success,
      () => NIX_TYPE_ATTRS
    )
    .otherwise(() => NIX_TYPE_STR);
}

function extractEnumValueFromDeclaration(valueDeclaration: Node): Maybe<number> {
  return match(valueDeclaration.getKind())
    .with(SyntaxKind.EnumMember, () => {
      try {
        const value = (valueDeclaration as { getValue?: () => number }).getValue?.();
        if (z.number().safeParse(value).success) return Maybe.just(value as number);
      } catch {
        // When ts-morph refuses to evaluate a const enum (Happens with Vendicated's ActivityType),
        // keep digging through the initializer instead of swallowing the error
      }
      const enumMember = valueDeclaration.asKind(SyntaxKind.EnumMember);
      const initializer = enumMember?.getInitializer();
      return match(initializer?.getKind())
        .with(SyntaxKind.NumericLiteral, () => {
          if (!initializer) return Maybe.nothing<number>();
          const numericLiteral = initializer.asKindOrThrow(SyntaxKind.NumericLiteral);
          return Maybe.just(parseInt(numericLiteral.getLiteralValue().toString(), PARSE_INT_RADIX));
        })
        .otherwise(() => Maybe.nothing<number>());
    })
    .otherwise(() => Maybe.nothing<number>());
}

function resolveOptionTypeNameFromNode(typeNode: Node, _checker: TypeChecker): Maybe<string> {
  const extractTypeValue = (): Maybe<string | number> => {
    return match(typeNode.getKind())
      .with(SyntaxKind.PropertyAccessExpression, () => {
        const propAccess = typeNode.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
        const propName = propAccess.getName();
        try {
          const symbol = propAccess.getSymbol();
          if (symbol) {
            const valueDeclaration = symbol.getValueDeclaration();
            if (valueDeclaration) {
              const enumValue = extractEnumValueFromDeclaration(valueDeclaration);
              return enumValue
                .map((val) => OptionTypeMap[val] as string | number)
                .orElse(() => Maybe.just<string | number>(propName));
            }
          }
        } catch {
          // The symbol API likes to throw when the declaration lives outside the current project;
          // if that happens, just fall back to the raw property name
        }
        return Maybe.just<string | number>(propName);
      })
      .with(SyntaxKind.Identifier, () => {
        const identifier = typeNode.asKindOrThrow(SyntaxKind.Identifier);
        const symbol = identifier.getSymbol();
        if (symbol) {
          const valueDeclaration = symbol.getValueDeclaration();
          if (valueDeclaration) {
            const enumValue = extractEnumValueFromDeclaration(valueDeclaration);
            return enumValue.map((val) => OptionTypeMap[val] as string | number);
          }
        }
        return Maybe.nothing<string | number>();
      })
      .with(SyntaxKind.NumericLiteral, () => {
        const numeric = typeNode.asKindOrThrow(SyntaxKind.NumericLiteral);
        return Maybe.just<string | number>(
          OptionTypeMap[parseInt(numeric.getLiteralValue().toString(), PARSE_INT_RADIX)] as
            | string
            | number
        );
      })
      .otherwise(() => Maybe.nothing<string | number>());
  };

  const typeValueResult = extractTypeValue();
  if (typeValueResult.isNothing) {
    return Maybe.nothing<string>();
  }

  const resolved = match(typeValueResult.value)
    .with(P.string, (v) => v)
    .with(P.number, (v) => OptionTypeMap[v] as string)
    .otherwise(() => undefined as string | undefined);

  return resolved !== undefined ? Maybe.just(resolved) : Maybe.nothing<string>();
}

function buildEnumValuesFromOptions(
  options: unknown
): readonly (string | number | boolean)[] | undefined {
  const parseResult = OptionsArraySchema.safeParse(options);
  if (!parseResult.success || !parseResult.data) {
    return Object.freeze([]);
  }

  const enumValues = pipe(
    parseResult.data,
    map((option) => {
      const valueResult = EnumValueSchema.safeParse(option.value);
      return valueResult.success ? valueResult.data : null;
    }),
    filter((val): val is string | number | boolean => val !== null)
  );

  return Object.freeze(enumValues);
}

function nixTypeForComponentOrCustom(defaultValue: unknown): string {
  return match(defaultValue)
    .with(undefined, () => NIX_TYPE_ATTRS)
    .otherwise(() => inferNixTypeFromRuntimeDefault(defaultValue));
}

function inferTypeFromTypeScriptType(
  typeNode: Node,
  checker: TypeChecker,
  defaultValue: unknown
): string | undefined {
  try {
    const type = checker.getTypeAtLocation(typeNode);
    if (!type) return undefined;

    const symbol = type.getSymbol();
    const typeName = symbol?.getName() ?? type.getText();

    // Equicord and Vencord sprinkle string/number/bool annotations all over settings;
    // sniff those fast so we don't have to walk union members for the most common cases
    return match(typeName)
      .when(
        (name) => name === TS_TYPE_STRING || name.includes(TS_TYPE_STRING),
        () => NIX_TYPE_STR
      )
      .when(
        (name) => name === TS_TYPE_NUMBER || name.includes(TS_TYPE_NUMBER),
        () => {
          // Slider defaults in actual plugins are floats while toggles are ints
          return match(defaultValue)
            .with(P.number, (val) => (Number.isInteger(val) ? NIX_TYPE_INT : NIX_TYPE_FLOAT))
            .otherwise(() => NIX_TYPE_INT);
        }
      )
      .when(
        (name) => name === TS_TYPE_BOOLEAN || name.includes(TS_TYPE_BOOLEAN),
        () => NIX_TYPE_BOOL
      )
      .when(
        (name) =>
          name.includes(TS_ARRAY_BRACKET_PATTERN) || name.includes(TS_ARRAY_GENERIC_PATTERN),
        () => NIX_TYPE_ATTRS // Arrays become listOf* in a later inference pass once we know shape
      )
      .otherwise(() => {
        // Union types show up in shared helpers (e.g., string | undefined defaults);
        const unionTypes = type.getUnionTypes();
        return match(unionTypes.length === 0)
          .with(true, () => undefined as string | undefined)
          .with(false, () => {
            const typeNames = pipe(
              unionTypes,
              map((t) => t.getText())
            );
            return match([
              every((n: string) => n === TS_TYPE_STRING || n.includes(TS_TYPE_STRING), typeNames),
              every((n: string) => n === TS_TYPE_NUMBER || n.includes(TS_TYPE_NUMBER), typeNames),
              every((n: string) => n === TS_TYPE_BOOLEAN || n.includes(TS_TYPE_BOOLEAN), typeNames),
            ] as const)
              .with([true, P._, P._], () => NIX_TYPE_STR)
              .with([P._, true, P._], () => NIX_TYPE_INT)
              .with([P._, P._, true], () => NIX_TYPE_BOOL)
              .otherwise(() => undefined as string | undefined);
          })
          .exhaustive();
      });
  } catch {
    return undefined;
  }
}

export function tsTypeToNixType(
  setting: Readonly<{ type?: unknown; default?: unknown; options?: unknown }>,
  _program: Program,
  _checker: TypeChecker
): Readonly<{
  readonly nixType: string;
  readonly enumValues?: readonly (string | number | boolean)[];
}> {
  const type = setting.type;
  if (!type || !isNode(type)) {
    const NumberTypeSchema = z.number();
    const parsedType = NumberTypeSchema.safeParse(type);
    if (parsedType.success && parsedType.data in OptionTypeMap) {
      const typeValue = OptionTypeMap[parsedType.data];
      if (typeValue === OPTION_TYPE_COMPONENT || typeValue === OPTION_TYPE_CUSTOM) {
        return { nixType: nixTypeForComponentOrCustom(setting.default) };
      }
    }
    // Equicord/Vencord authors frequently forget `type: OptionType.SELECT` when they already
    // provide an options array (see Equicord `src/plugins/greetStickerPicker/index.tsx`)
    // Without this block the AST would scream “string”, we'd emit a plain str in Nix, and the
    // enum disappears from the generated module. Treat “options without type” as a select and
    // salvage the enum values
    const enumValues = buildEnumValuesFromOptions(setting.options);
    if (enumValues && !isEmpty(enumValues)) {
      const boolEnum =
        enumValues.length === BOOLEAN_ENUM_LENGTH &&
        every((value): value is boolean => BooleanSchema.safeParse(value).success, enumValues) &&
        new Set(enumValues).size === BOOLEAN_ENUM_LENGTH;
      if (boolEnum) {
        return { nixType: NIX_TYPE_BOOL };
      }
      return { nixType: NIX_ENUM_TYPE, enumValues };
    }
    return { nixType: inferNixTypeFromRuntimeDefault(setting.default) };
  }

  const typeName = resolveOptionTypeNameFromNode(type, _checker);

  if (typeName.isJust) {
    return match(typeName.value)
      .with(OPTION_TYPE_BOOLEAN, () => ({ nixType: NIX_TYPE_BOOL }))
      .with(OPTION_TYPE_STRING, () => ({ nixType: NIX_TYPE_STR }))
      .with(OPTION_TYPE_NUMBER, () => {
        return match(setting.default)
          .with(P.number, (val) => ({
            nixType: Number.isInteger(val) ? NIX_TYPE_INT : NIX_TYPE_FLOAT,
          }))
          .otherwise(() => ({ nixType: NIX_TYPE_FLOAT }));
      })
      .with(OPTION_TYPE_BIGINT, () => ({ nixType: NIX_TYPE_INT }))
      .with(OPTION_TYPE_SELECT, () => {
        const enumValues = buildEnumValuesFromOptions(setting.options) ?? Object.freeze([]);
        const boolEnum =
          enumValues.length === BOOLEAN_ENUM_LENGTH &&
          every((value): value is boolean => BooleanSchema.safeParse(value).success, enumValues) &&
          new Set(enumValues).size === BOOLEAN_ENUM_LENGTH;
        if (boolEnum) {
          return { nixType: NIX_TYPE_BOOL };
        }
        return { nixType: NIX_ENUM_TYPE, enumValues };
      })
      .with(OPTION_TYPE_SLIDER, () => ({ nixType: NIX_TYPE_FLOAT }))
      .with(OPTION_TYPE_COMPONENT, () => ({
        nixType: nixTypeForComponentOrCustom(setting.default),
      }))
      .with(OPTION_TYPE_CUSTOM, () => ({
        nixType: nixTypeForComponentOrCustom(setting.default),
      }))
      .otherwise(() => ({ nixType: inferNixTypeFromRuntimeDefault(setting.default) }));
  }

  // Still no explicit OptionType? Lean on the TS checker so third-party plugins that only ship
  // types (common in Equicord forks) continue to map to sensible Nix types
  const inferredType = inferTypeFromTypeScriptType(type, _checker, setting.default);
  const enumValues = buildEnumValuesFromOptions(setting.options);
  if (inferredType) {
    return enumValues ? { nixType: inferredType, enumValues } : { nixType: inferredType };
  }
  return enumValues
    ? { nixType: inferNixTypeFromRuntimeDefault(setting.default), enumValues }
    : { nixType: inferNixTypeFromRuntimeDefault(setting.default) };
}
