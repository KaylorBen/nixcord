import { camelCase } from 'change-case';
import { pipe, isEmpty, keys, omitBy, sortBy } from 'remeda';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import type { ReadonlyDeep } from 'type-fest';
import { escapeNixDoubleQuotedString, escapeNixString } from './utils/nix-escape.js';

const NullSchema = z.null();
const ArraySchema = z.array(z.unknown());
const ObjectSchema = z
  .object({})
  .catchall(z.unknown())
  .refine((val) => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'Must be a non-array object',
  });

const isNull = (x: unknown): x is null => NullSchema.safeParse(x).success;
const isArray = (x: unknown): x is unknown[] => ArraySchema.safeParse(x).success;
const isObject = (x: unknown): x is object => ObjectSchema.safeParse(x).success;

export type NixValue = string | number | boolean | null | NixValue[] | NixAttrSet | NixRaw;

export interface NixAttrSet {
  [key: string]: NixValue | undefined;
}

export type ReadonlyNixAttrSet = ReadonlyDeep<Record<string, NixValue | undefined>>;

export interface NixRaw {
  type: 'raw';
  value: string;
}

export interface NixGeneratorOptions {
  indent: string;
}

const DEFAULT_INDENT = '  ';
const NIX_NULL = 'null';
const NIX_RAW_TYPE = 'raw';

const NIX_LIST_OPEN = '[';
const NIX_LIST_CLOSE = ']';
const NIX_EMPTY_LIST = '[ ]';
const NIX_ATTR_SET_OPEN = '{';
const NIX_ATTR_SET_CLOSE = '}';
const NIX_EMPTY_ATTR_SET = '{ }';
const NIX_ASSIGNMENT = ' = ';
const NIX_LIST_SEPARATOR = '\n';
const NIX_STATEMENT_TERMINATOR = ';';

const NIX_MULTILINE_STRING_START = "''";
const NIX_MULTILINE_STRING_END = "''";
const NIX_DOUBLE_QUOTED_STRING_START = '"';
const NIX_DOUBLE_QUOTED_STRING_END = '"';
const NEWLINE_CHAR = '\n';

/**
 * Tiny Nix serializer used by the plugin generator. All the data we feed in comes from
 * Vencord/Equicord plugin configs, so the output needs to stay readable in Git diffs
 * when people add settings upstream.
 */
export class NixGenerator {
  private readonly options: Readonly<NixGeneratorOptions>;

  constructor(options?: Partial<NixGeneratorOptions>) {
    this.options = {
      indent: options?.indent ?? DEFAULT_INDENT,
    };
  }

  private indent(level: number = 1): string {
    return this.options.indent.repeat(level);
  }

  /**
   * Converts a JavaScript string to Nix string syntax.
   *
   * Picks double-quoted strings for simple text, or multiline strings (''...'') when
   * there are newlines or you ask for multiline. Multiline strings handle quotes and
   * special characters better.
   */
  string(str: string, multiline: boolean = false): string {
    return match([multiline, str.includes(NEWLINE_CHAR)] as const)
      .with(
        [P.union(true, false), true],
        () => `${NIX_MULTILINE_STRING_START}${escapeNixString(str)}${NIX_MULTILINE_STRING_END}`
      )
      .with(
        [true, false],
        () => `${NIX_MULTILINE_STRING_START}${escapeNixString(str)}${NIX_MULTILINE_STRING_END}`
      )
      .otherwise(
        () =>
          `${NIX_DOUBLE_QUOTED_STRING_START}${escapeNixDoubleQuotedString(
            str
          )}${NIX_DOUBLE_QUOTED_STRING_END}`
      );
  }

  number(n: number): string {
    return n.toString();
  }

  boolean(b: boolean): string {
    return b.toString();
  }

  nullValue(): string {
    return NIX_NULL;
  }

  raw(value: string): NixRaw {
    return { type: NIX_RAW_TYPE, value };
  }

  /**
   * Formats a JavaScript array as a Nix list.
   *
   * Each item goes on its own line with proper indentation. Empty lists show as "[ ]"
   * (with a space) so they're easier to read.
   */
  list(items: readonly NixValue[], level: number = 0): string {
    if (isEmpty(items)) return NIX_EMPTY_LIST;

    const indent = this.indent(level);
    const itemIndent = this.indent(level + 1);
    const result: string[] = [NIX_LIST_OPEN];

    for (const item of items) {
      const itemStr = this.value(item, level + 1);
      result.push(`${itemIndent}${itemStr}`);
    }

    result.push(`${indent}${NIX_LIST_CLOSE}`);
    return result.join(NIX_LIST_SEPARATOR);
  }

  /**
   * Formats a JavaScript object as a Nix attribute set.
   *
   * Keys are sorted alphabetically so output stays consistent. Each pair goes on its
   * own line like "key = value;". Empty attrsets show as "{ }" (with a space) for
   * readability. Undefined values are dropped, but null is kept since it's valid in
   * Nix (e.g., for nullOr types).
   */
  attrSet(attrs: ReadonlyNixAttrSet | NixAttrSet, level: number = 0): string {
    const filteredAttrs = omitBy(attrs, (value) => value === undefined);
    const sortedKeys = pipe(
      filteredAttrs,
      keys(),
      sortBy((x) => x)
    );
    const sortedKeysWithEnable = match(sortedKeys.indexOf('enable'))
      .with(-1, () => sortedKeys)
      .otherwise((enableIdx) => {
        const keys = [...sortedKeys];
        keys.splice(enableIdx, 1);
        keys.unshift('enable');
        return keys;
      });

    return match(isEmpty(sortedKeysWithEnable))
      .with(true, () => NIX_EMPTY_ATTR_SET)
      .with(false, () => {
        const indent = this.indent(level);
        const propIndent = this.indent(level + 1);
        const result: string[] = [NIX_ATTR_SET_OPEN];
        for (const key of sortedKeysWithEnable) {
          const attrValue = filteredAttrs[key];
          if (attrValue === undefined) continue;
          const keyStr = this.identifier(key);
          const valueStr = this.value(attrValue as NixValue, level + 1);
          result.push(
            `${propIndent}${keyStr}${NIX_ASSIGNMENT}${valueStr}${NIX_STATEMENT_TERMINATOR}`
          );
        }

        result.push(`${indent}${NIX_ATTR_SET_CLOSE}`);
        return result.join(NIX_LIST_SEPARATOR);
      })
      .exhaustive();
  }

  /**
   * Converts any NixValue to its Nix string representation.
   *
   * Dispatches by type: NixRaw passes through as-is (for pre-formatted code), strings
   * get escaped, numbers and booleans become strings, null becomes the Nix null literal,
   * arrays become lists, and objects become attribute sets. The level parameter controls
   * indentation depth for nested structures.
   */
  value(val: NixValue, level: number = 0): string {
    if (isObject(val) && !isNull(val) && 'type' in val && (val as NixRaw).type === NIX_RAW_TYPE) {
      return (val as NixRaw).value;
    }

    if (isArray(val)) {
      return this.list(val as readonly NixValue[], level);
    }

    return match(val)
      .with(P.string, (v) => this.string(v))
      .with(P.number, (v) => this.number(v))
      .with(P.boolean, (v) => this.boolean(v))
      .with(null, () => this.nullValue())
      .when(
        (v): v is NixAttrSet => isObject(v) && !isNull(v),
        (v) => this.attrSet(v as NixAttrSet, level)
      )
      .otherwise(() => NIX_NULL);
  }

  private static readonly PARENTHESES_PATTERN = /\s*\([^)]*\)\s*/g;
  private static readonly INVALID_CHARS_PATTERN = /[^A-Za-z0-9_'-]/g;
  private static readonly LEADING_TRAILING_UNDERSCORES_PATTERN = /^_+|_+$/g;
  private static readonly MULTIPLE_UNDERSCORES_PATTERN = /_+/g;
  private static readonly VALID_IDENTIFIER_START_PATTERN = /^[A-Za-z_]/;

  private static readonly LEADING_UNDERSCORE_PREFIX = '_';

  /**
   * Sanitizes a string to be a valid Nix identifier.
   *
   * Nix identifiers must start with a letter or underscore, and can only contain letters,
   * digits, underscores, hyphens, and apostrophes. This function:
   *
   * 1. Strips parenthetical text (e.g., "name (restart)" becomes "name")
   * 2. Replaces invalid characters with underscores
   * 3. Trims leading/trailing underscores
   * 4. Collapses multiple underscores into one
   * 5. Converts to camelCase
   * 6. Adds an underscore prefix if it doesn't start with a valid character
   */
  identifier(name: string): string {
    const originalStartsWithUnderscore = name.startsWith('_');
    const originalEndsWithUnderscore = name.endsWith('_');
    let sanitized = name
      .replace(NixGenerator.PARENTHESES_PATTERN, '')
      .replace(NixGenerator.INVALID_CHARS_PATTERN, '_')
      .replace(NixGenerator.LEADING_TRAILING_UNDERSCORES_PATTERN, '')
      .replace(NixGenerator.MULTIPLE_UNDERSCORES_PATTERN, '_');

    const needsPrefix =
      isEmpty(sanitized) ||
      sanitized.startsWith('-') ||
      (!isEmpty(sanitized) && !NixGenerator.VALID_IDENTIFIER_START_PATTERN.test(sanitized));

    sanitized = camelCase(sanitized);

    if (
      originalStartsWithUnderscore &&
      !originalEndsWithUnderscore &&
      sanitized &&
      NixGenerator.VALID_IDENTIFIER_START_PATTERN.test(sanitized)
    ) {
      return '_' + sanitized;
    }

    if (
      needsPrefix ||
      isEmpty(sanitized) ||
      !NixGenerator.VALID_IDENTIFIER_START_PATTERN.test(sanitized)
    ) {
      sanitized = NixGenerator.LEADING_UNDERSCORE_PREFIX + sanitized;
    }

    return sanitized;
  }
}
