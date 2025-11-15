import { entries, keys, map, pipe, reduce } from 'remeda';
import { filter as iterFilter, map as iterMap, toArray as iterToArray } from 'iter-tools';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import type { PluginConfig, PluginSetting } from '../types.js';
import { type NixAttrSet, NixGenerator, type NixRaw, type NixValue } from './generator-base.js';
import {
  INTEGER_STRING_PATTERN,
  NIX_ENUM_TYPE,
  NIX_TYPE_FLOAT,
  NIX_TYPE_INT,
} from '../ast/extractor/constants.js';

const StringSchema = z.string();
const NumberSchema = z.number();
const BooleanSchema = z.boolean();
const NullSchema = z.null();
const ArraySchema = z.array(z.unknown());
const ObjectSchema = z.object({}).catchall(z.unknown());

const isString = (x: unknown): x is string => StringSchema.safeParse(x).success;
const isNumber = (x: unknown): x is number => NumberSchema.safeParse(x).success;
const isBoolean = (x: unknown): x is boolean => BooleanSchema.safeParse(x).success;
const isNull = (x: unknown): x is null => NullSchema.safeParse(x).success;
const isArray = (x: unknown): x is unknown[] => ArraySchema.safeParse(x).success;
const isObject = (x: unknown): x is object =>
  typeof x === 'object' && x !== null && ObjectSchema.safeParse(x).success;

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
  enumLabels?: Readonly<Record<string, string> & Partial<Record<number, string>>>
): string | null {
  const integerValues = enumValues.filter((v): v is number => typeof v === 'number');
  if (integerValues.length === 0 || !enumLabels) {
    return null;
  }

  const mappings: string[] = [];
  for (const intValue of integerValues) {
    // Use the label from the source code if available
    const label = enumLabels[intValue];
    if (label) {
      mappings.push(`${intValue} = ${label}`);
    }
  }

  return mappings.length > 0 ? mappings.join(', ') : null;
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

  const defaultValueResult = match(setting.default)
    .with(undefined, () => undefined)
    .otherwise((defaultValue) => {
      // Home Manager's `types.float` is strict about floating point literals, so
      // integer defaults need to be emitted as `1.0` instead of `1`.
      return match([setting.type, defaultValue] as const)
        .when(
          ([type, val]) => isNumber(val) && type === NIX_TYPE_FLOAT && Number.isInteger(val),
          ([, val]) => gen.raw((val as number).toFixed(1))
        )
        .when(
          ([type, val]) =>
            type === NIX_TYPE_INT && isString(val) && INTEGER_STRING_PATTERN.test(val),
          ([, val]) => gen.raw(val as string)
        )
        .when(
          ([, val]) =>
            isString(val) ||
            isNumber(val) ||
            isBoolean(val) ||
            isNull(val) ||
            isArray(val) ||
            (isObject(val) && !isNull(val)),
          ([, val]) => val as NixValue
        )
        .otherwise(() => undefined);
    });

  if (defaultValueResult !== undefined) {
    config.default = defaultValueResult;
  }

  if (setting.description) {
    let descStr = setting.description;

    // For integer enums, append the value mapping to the description
    const isIntegerEnum =
      setting.type === NIX_ENUM_TYPE && setting.enumValues?.every((v) => typeof v === 'number');
    if (isIntegerEnum && setting.enumValues) {
      const mapping = buildEnumMappingDescription(setting.enumValues, setting.enumLabels);
      if (mapping) {
        descStr = `${descStr}\n\nValues: ${mapping}`;
      }
    }

    config.description = gen.raw(gen.string(descStr, true));
  }

  if (setting.example && !setting.description?.includes(setting.example)) {
    config.example = setting.example;
  }

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

  const hasExplicitEnable = Object.hasOwn(config.settings, ENABLE_SETTING_NAME);
  if (hasExplicitEnable) {
    return baseAttrSet;
  }

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
}

export function generateNixModule(
  plugins: Readonly<Record<string, PluginConfig>>,
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
