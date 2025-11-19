import { entries, filter, isEmpty, keys, map, pipe, reduce } from 'remeda';
import { filter as iterFilter, map as iterMap, toArray as iterToArray } from 'iter-tools';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { Maybe } from 'true-myth';
import type { ReadonlyDeep } from 'type-fest';
import type { PluginConfig, PluginSetting } from '../shared/types.js';
import { type NixAttrSet, NixGenerator, type NixRaw, type NixValue } from './generator-base.js';
import {
  INTEGER_STRING_PATTERN,
  NIX_ENUM_TYPE,
  NIX_TYPE_FLOAT,
  NIX_TYPE_INT,
} from '../core/ast/extractor/constants.js';

const StringSchema = z.string();
const NumberSchema = z.number();
const BooleanSchema = z.boolean();
const NullSchema = z.null();
const ArraySchema = z.array(z.unknown());
const ObjectSchema = z
  .object({})
  .catchall(z.unknown())
  .refine((val) => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'Must be a non-array object',
  });

const isString = (x: unknown): x is string => StringSchema.safeParse(x).success;
const isNumber = (x: unknown): x is number => NumberSchema.safeParse(x).success;
const isBoolean = (x: unknown): x is boolean => BooleanSchema.safeParse(x).success;
const isNull = (x: unknown): x is null => NullSchema.safeParse(x).success;
const isArray = (x: unknown): x is unknown[] => ArraySchema.safeParse(x).success;
const isObject = (x: unknown): x is object => ObjectSchema.safeParse(x).success;

const gen = new NixGenerator();

const ENABLE_SETTING_NAME = 'enable';
const NIX_ENABLE_OPTION_FUNCTION = 'mkEnableOption';
const NIX_OPTION_FUNCTION = 'mkOption';
const OPTION_CONFIG_INDENT_LEVEL = 2;
const MODULE_INDENT_LEVEL = 0;
const NIX_MODULE_HEADER = '{ lib, ... }:';
const NIX_MODULE_LET = 'let';
const NIX_MODULE_IN = 'in';
const NIX_MODULE_INHERIT = '  inherit (lib) types mkEnableOption mkOption;';

export type PluginCategory = 'shared' | 'vencord' | 'equicord';
type PluginEntry = readonly [string, NixAttrSet];

const isPluginEntry = (entry: PluginEntry | undefined): entry is PluginEntry => entry !== undefined;

function buildEnumMappingDescription(
  enumValues: readonly (string | number | boolean)[],
  enumLabels?: ReadonlyDeep<Record<string, string> & Partial<Record<number, string>>>
): Maybe<string> {
  const integerValues = filter(enumValues, (v): v is number => NumberSchema.safeParse(v).success);

  if (isEmpty(integerValues)) {
    return Maybe.nothing<string>();
  }
  if (enumLabels === undefined) {
    return Maybe.nothing<string>();
  }

  const mappings = pipe(
    integerValues,
    map((intValue) => {
      // Access labels by both number and string key to handle TypeScript/JavaScript key coercion
      const label = enumLabels[intValue] ?? enumLabels[String(intValue)];
      if (!label || typeof label !== 'string') {
        return null;
      }
      return `${intValue} = ${label}`;
    }),
    filter((val): val is string => val !== null)
  );

  const mappingStr = mappings.join(', ');
  return isEmpty(mappingStr) ? Maybe.nothing<string>() : Maybe.just(mappingStr);
}

function getCategoryLabel(category: PluginCategory): string {
  return match(category)
    .with('shared', () => ' (Shared between Vencord and Equicord)')
    .with('vencord', () => ' (Vencord-only)')
    .with('equicord', () => ' (Equicord-only)')
    .exhaustive();
}

function buildNixOptionConfig(setting: Readonly<PluginSetting>): NixAttrSet {
  const config: NixAttrSet = {};

  const typeConfig = match(setting.type)
    .when(
      (type) => type === NIX_ENUM_TYPE || type?.includes('enum'),
      () => {
        const enumValues = setting.enumValues ?? [];
        const values = pipe(
          enumValues,
          map((value) => {
            return match(value)
              .with(P.string, (v) => gen.string(v))
              .with(P.union(P.number, P.boolean), (v) => String(v))
              .otherwise((v) => gen.string(String(v)));
          })
        );
        return gen.raw(`${NIX_ENUM_TYPE} [ ${values.join(' ')} ]`);
      }
    )
    .otherwise((type) => gen.raw(type));

  config.type = typeConfig;

  // Defaults behave differently in Home Manager vs. the runtime store; write them verbatim so
  // plugins like Vencord's `customRPC` keep their nullable toggles intact
  match(setting.default)
    .with(undefined, () => {
      // No default declared in the AST, so mkOption will fall back to its own idea of “unset”
    })
    .with(null, () => {
      config.default = null;
    })
    .otherwise((defaultValue) => {
      // Home Manager's `types.float` refuses bare integers; Equicord slider defaults often use
      // `1` while declaring `types.float`, so emit `1.0` to keep evaluation happy.
      const defaultValueResult = match([setting.type, defaultValue] as const)
        .when(
          ([type, val]) => isNumber(val) && type === NIX_TYPE_FLOAT && Number.isInteger(val),
          ([, val]) => {
            const rawValue = gen.raw((val as number).toFixed(1));
            return Maybe.just(rawValue);
          }
        )
        .when(
          ([type, val]) =>
            type === NIX_TYPE_INT && isString(val) && INTEGER_STRING_PATTERN.test(val),
          ([, val]) => {
            const rawValue = gen.raw(val as string);
            return Maybe.just(rawValue);
          }
        )
        .when(
          ([, val]) =>
            isString(val) ||
            isNumber(val) ||
            isBoolean(val) ||
            isArray(val) ||
            (isObject(val) && !isNull(val)),
          ([, val]) => {
            // Maybe.just(null) explodes later, so guard here before we stash the value
            if (val === null) {
              return Maybe.nothing<Exclude<NixValue, null>>();
            }
            return Maybe.just(val as Exclude<NixValue, null>);
          }
        )
        .otherwise(() => Maybe.nothing<Exclude<NixValue, null>>());

      if (defaultValueResult.isJust) {
        config.default = defaultValueResult.value;
      }
    });

  match(setting.description)
    .with(P.string, (descStr) => {
      // Integer enums (ActivityType, ChannelType, etc.) make zero sense without a legend;
      // stitch the mapping straight into the description so generated docs stay readable
      const isIntegerEnum = match(setting.enumValues)
        .with(
          P.not(undefined),
          (enumValues) =>
            setting.type === NIX_ENUM_TYPE &&
            enumValues.every((v) => NumberSchema.safeParse(v).success)
        )
        .otherwise(() => false);

      const finalDesc = match([isIntegerEnum, setting.enumValues] as const)
        .with([true, P.not(undefined)], ([, enumValues]) => {
          return buildEnumMappingDescription(enumValues, setting.enumLabels)
            .map((mapping) => `${descStr}\n\nValues: ${mapping}`)
            .unwrapOr(descStr);
        })
        .otherwise(() => descStr);

      config.description = gen.raw(gen.string(finalDesc, true));
    })
    .otherwise(() => {
      // Some plugins never document settings (looking at you, legacy Discord ports). Leave empty
    });

  match([setting.example, setting.description] as const)
    .with([P.string, P.string], ([example, description]) => {
      return match(description.includes(example))
        .with(false, () => {
          config.example = example;
        })
        .with(true, () => {
          // Example is already in description, no need to duplicate
        })
        .exhaustive();
    })
    .with([P.string, P.union(undefined, P.nullish)], ([example]) => {
      config.example = example;
    })
    .otherwise(() => {
      // No example specified, so we let mkOption skip it
    });

  return config;
}

export function generateNixSetting(
  setting: Readonly<PluginSetting>,
  category?: PluginCategory
): NixRaw {
  return match(setting.name === ENABLE_SETTING_NAME)
    .with(true, () => {
      const desc = match(category)
        .with(P.union('shared', 'vencord', 'equicord'), (cat) => {
          const baseDesc = setting.description ?? '';
          return baseDesc + getCategoryLabel(cat);
        })
        .otherwise(() => setting.description ?? '');
      const descStr = desc ? gen.string(desc, true) : '""';
      return gen.raw(`${NIX_ENABLE_OPTION_FUNCTION} ${descStr}`);
    })
    .otherwise(() => {
      const optionConfig = buildNixOptionConfig(setting);
      const configString = gen.attrSet(optionConfig, OPTION_CONFIG_INDENT_LEVEL);
      return gen.raw(`${NIX_OPTION_FUNCTION} ${configString}`);
    });
}

export function generateNixPlugin(
  _pluginName: string,
  config: Readonly<PluginConfig>,
  category?: PluginCategory
): NixAttrSet {
  const baseAttrSet = pipe(
    entries(config.settings),
    reduce((acc, [, setting]) => {
      const nixName = gen.identifier(setting.name);
      acc[nixName] =
        'settings' in setting
          ? generateNixPlugin(setting.name, setting as PluginConfig, category)
          : generateNixSetting(setting as PluginSetting, category);
      return acc;
    }, {} as NixAttrSet)
  );

  return match(Object.hasOwn(config.settings, ENABLE_SETTING_NAME))
    .with(true, () => baseAttrSet)
    .with(false, () => {
      const description = match(category)
        .with(P.union('shared', 'vencord', 'equicord'), (cat) => {
          const baseDesc = config.description ?? '';
          return baseDesc + getCategoryLabel(cat);
        })
        .otherwise(() => config.description ?? '');
      const descStr = description ? gen.string(description, true) : '""';

      return {
        enable: gen.raw(`${NIX_ENABLE_OPTION_FUNCTION} ${descStr}`),
        ...baseAttrSet,
      };
    })
    .exhaustive();
}

export function generateNixModule(
  plugins: ReadonlyDeep<Record<string, PluginConfig>>,
  category?: PluginCategory
): string {
  const lines: readonly string[] = [
    '# This file is auto-generated by scripts/generate-plugin-options',
    '# DO NOT EDIT this file directly; instead update the generator',
    '',
    NIX_MODULE_HEADER,
    NIX_MODULE_LET,
    NIX_MODULE_INHERIT,
    NIX_MODULE_IN,
  ];

  const pluginNames = keys(plugins);
  const pluginEntries = iterToArray(
    iterFilter(
      isPluginEntry,
      iterMap((pluginName: string) => {
        return match(plugins[pluginName])
          .with(P.not(undefined), (pluginConfig) => {
            const nixName = gen.identifier(pluginName);
            return [nixName, generateNixPlugin(pluginName, pluginConfig, category)] as const;
          })
          .otherwise(() => undefined);
      }, pluginNames)
    )
  );
  const allPluginsSet = pipe(
    pluginEntries,
    reduce((acc, [nixName, pluginAttr]) => {
      acc[nixName] = pluginAttr;
      return acc;
    }, {} as NixAttrSet)
  );

  const moduleContent = gen.attrSet(allPluginsSet, MODULE_INDENT_LEVEL);

  return [...lines, moduleContent].join('\n');
}
