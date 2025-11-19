import { camelCase } from 'change-case';
import { isEmpty } from 'remeda';
import { match, P } from 'ts-pattern';

const INTERPOLATION_START_SEQUENCE_LENGTH = 2; // Skip both characters in "${" when neutering injected template snippets

// Escape tables for the generated double-quoted strings that carry plugin descriptions/examples
const ESCAPED_BACKSLASH = '\\\\'; // Keep literal backslashes from collapsing escape sequences (common in regex-heavy plugins)
const ESCAPED_INTERPOLATION = '\\${'; // Prevent `${...}` text from becoming real interpolation in the rendered Nix module
const ESCAPED_QUOTE = '\\"'; // Preserve quote marks inside descriptions so Nix parsing stays sane

const BACKSLASH_CHAR = '\\';
const DOLLAR_CHAR = '$';
const OPEN_BRACE_CHAR = '{';
const DOUBLE_QUOTE_CHAR = '"';

/**
 * Escapes special characters in Nix double-quoted strings.
 *
 * Nix double-quoted strings support string interpolation via ${...}, so we need
 * to escape $ and ${ to prevent unintended interpolation. We also escape backslashes
 * and quotes for proper string syntax.
 *
 * Uses character-by-character parsing to handle ${ as a single sequence (since $
 * alone and ${ have different escape requirements).
 */
export function escapeNixDoubleQuotedString(str: string): string {
  let result = '';
  let i = 0;

  while (i < str.length) {
    const char = str[i];
    const next = i + 1 < str.length ? str[i + 1] : null;

    const [escaped, increment] = match([char, next] as const)
      .with([BACKSLASH_CHAR, P._], () => [ESCAPED_BACKSLASH, 1] as const)
      .with(
        [DOLLAR_CHAR, OPEN_BRACE_CHAR],
        () => [ESCAPED_INTERPOLATION, INTERPOLATION_START_SEQUENCE_LENGTH] as const
      )
      .with([DOUBLE_QUOTE_CHAR, P._], () => [ESCAPED_QUOTE, 1] as const)
      .otherwise(() => [char, 1] as const);

    result += escaped;
    i += increment;
  }

  return result;
}

// Escape tables for multiline (''...'') chunks used by shiki theme URLs and long descriptions
const NIX_MULTILINE_START = "''";
const ESCAPED_DOUBLE_QUOTE = "'''"; // Treat literal '' inside the body as text, not the closing delimiter
const DOLLAR_PREFIX = "''$"; // Stop `${}` sequences embedded in docs from kicking off interpolation
const ESCAPED_NEWLINE = "''\\\n"; // Preserve explicit "\n" strings (plenty of Equicord descriptions use them for emphasis)

const SINGLE_QUOTE_CHAR = "'";
const SPACE_CHAR = ' ';

// Regex helpers used to scrub troublesome characters from multiline bodies
const DOUBLE_QUOTE_PATTERN = /''/g;
const DOLLAR_PATTERN = /\$/g;
const ESCAPED_NEWLINE_PATTERN = /\\\n/g;
const SINGLE_QUOTE_AT_END_PATTERN = /\s'$/; // Detect a trailing `'` so we can pad it; Nix refuses bare quotes at EOF

/**
 * Escapes special characters in Nix multiline strings (''...'').
 *
 * Nix multiline strings use '' as delimiters, so we need to escape:
 * - '' -> ''' (to escape the delimiter inside the string)
 * - $ -> ''$ (to prevent string interpolation)
 * - \n -> ''\n (to escape newlines)
 *
 * Special case: Nix multiline strings can't end with a bare single quote '.
 * If the string ends with ' (but not '' or whitespace+'), we append a space.
 * This is a Nix parser requirement to avoid ambiguity with the closing ''.
 */
export function escapeNixString(str: string): string {
  let escaped = str;
  // Copy literal `''` into `'''` so the delimiter keeps behaving like plain text
  escaped = escaped.replace(DOUBLE_QUOTE_PATTERN, ESCAPED_DOUBLE_QUOTE);
  // `$` is an interpolation trigger even in multiline strings, so fence it off.
  escaped = escaped.replace(DOLLAR_PATTERN, DOLLAR_PREFIX);
  // Turn `\n` into `''\n` so literal newline markers survive round-tripping
  escaped = escaped.replace(ESCAPED_NEWLINE_PATTERN, ESCAPED_NEWLINE);

  // Nix refuses to parse a multiline string that ends with a naked `'`;
  // append a space unless it's already padded or part of the closing `''`
  if (
    escaped.endsWith(SINGLE_QUOTE_CHAR) &&
    !escaped.endsWith(NIX_MULTILINE_START) &&
    !escaped.match(SINGLE_QUOTE_AT_END_PATTERN)
  ) {
    escaped += SPACE_CHAR;
  }
  return escaped;
}

export function toCamelCase(str: string): string {
  if (isEmpty(str)) return str;
  return camelCase(str);
}

// Patterns used to turn human-friendly setting names into camelCase identifiers for mkOption attr paths
const PARENTHESES_PATTERN = /\s*\([^)]*\)\s*/g; // Drop reminders like " (restart required)"—they belong in descriptions, not identifiers
const INVALID_CHARS_PATTERN = /[^A-Za-z0-9_'-]/g; // Anything else (em dashes, emojis) becomes `_`
const LEADING_TRAILING_UNDERSCORES_PATTERN = /^_+|_+$/g; // Clean up edges after replacement
const MULTIPLE_UNDERSCORES_PATTERN = /_+/g; // Collapse spammy `_` runs into a single underscore
const VALID_IDENTIFIER_START_PATTERN = /^[A-Za-z_]/; // Nix insists identifiers start with alpha/underscore, so we check now

const LEADING_UNDERSCORE_PREFIX = '_';

/**
 * Sanitizes a string to be a valid Nix identifier.
 *
 * Nix identifiers must start with a letter or underscore, and can only contain
 * letters, digits, underscores, hyphens, and apostrophes. This function:
 *
 * 1. Strips parenthetical text (e.g., "name (restart)" becomes "name")
 * 2. Replaces invalid characters with underscores
 * 3. Trims leading/trailing underscores
 * 4. Collapses multiple underscores into one
 * 5. Converts to camelCase
 * 6. Adds an underscore prefix if it doesn't start with a valid character
 */
export function sanitizeNixIdentifier(str: string): string {
  let sanitized = str
    .replace(PARENTHESES_PATTERN, '') // Drop "(restart)" noise so identifiers stay short
    .replace(INVALID_CHARS_PATTERN, '_') // Swap anything odd for underscores
    .replace(LEADING_TRAILING_UNDERSCORES_PATTERN, '') // Avoid accidental leading/trailing underscores
    .replace(MULTIPLE_UNDERSCORES_PATTERN, '_'); // Leave at most one underscore at a time

  sanitized = toCamelCase(sanitized);

  // If the cleaned identifier still starts with a digit (common for `24hClock`), prefix `_`
  if (isEmpty(sanitized) || !VALID_IDENTIFIER_START_PATTERN.test(sanitized)) {
    sanitized = LEADING_UNDERSCORE_PREFIX + sanitized;
  }

  return sanitized;
}
