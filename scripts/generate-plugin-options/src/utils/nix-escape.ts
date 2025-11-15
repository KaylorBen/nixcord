import { camelCase } from 'change-case';
import { isEmpty } from 'remeda';
import { match, P } from 'ts-pattern';

const INTERPOLATION_START_SEQUENCE_LENGTH = 2; // "${" is 2 characters

// Nix double-quoted string escape sequences
const ESCAPED_BACKSLASH = '\\\\'; // \ -> \\
const ESCAPED_INTERPOLATION = '\\${'; // ${ -> \${ to prevent string interpolation
const ESCAPED_QUOTE = '\\"'; // " -> \"

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

// Nix multiline string (''...'') escape sequences and markers
const NIX_MULTILINE_START = "''";
const ESCAPED_DOUBLE_QUOTE = "'''"; // '' inside string becomes ''' to escape it
const DOLLAR_PREFIX = "''$"; // $ in multiline string becomes ''$ to escape it
const ESCAPED_NEWLINE = "''\\\n"; // \n in multiline string becomes ''\n to escape it

const SINGLE_QUOTE_CHAR = "'";
const SPACE_CHAR = ' ';

// Regex patterns for multiline string escaping
const DOUBLE_QUOTE_PATTERN = /''/g;
const DOLLAR_PATTERN = /\$/g;
const ESCAPED_NEWLINE_PATTERN = /\\\n/g;
const SINGLE_QUOTE_AT_END_PATTERN = /\s'$/; // Whitespace followed by single quote at end

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
  // Escape '' delimiter by doubling one quote: '' -> '''
  escaped = escaped.replace(DOUBLE_QUOTE_PATTERN, ESCAPED_DOUBLE_QUOTE);
  // Escape $ to prevent interpolation: $ -> ''$
  escaped = escaped.replace(DOLLAR_PATTERN, DOLLAR_PREFIX);
  // Escape escaped newlines: \n -> ''\n
  escaped = escaped.replace(ESCAPED_NEWLINE_PATTERN, ESCAPED_NEWLINE);

  // Nix parser requirement: cannot end with bare single quote
  // Add space if ending with ' but not '' or whitespace+'
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

// Regex patterns for identifier sanitization
const PARENTHESES_PATTERN = /\s*\([^)]*\)\s*/g; // Remove text in parentheses: "name (restart)" -> "name"
const INVALID_CHARS_PATTERN = /[^A-Za-z0-9_'-]/g; // Replace invalid chars with underscore
const LEADING_TRAILING_UNDERSCORES_PATTERN = /^_+|_+$/g; // Remove leading/trailing underscores
const MULTIPLE_UNDERSCORES_PATTERN = /_+/g; // Collapse multiple underscores into one
const VALID_IDENTIFIER_START_PATTERN = /^[A-Za-z_]/; // Must start with letter or underscore

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
    .replace(PARENTHESES_PATTERN, '') // Remove parenthetical content
    .replace(INVALID_CHARS_PATTERN, '_') // Replace invalid chars with underscore
    .replace(LEADING_TRAILING_UNDERSCORES_PATTERN, '') // Trim underscores from edges
    .replace(MULTIPLE_UNDERSCORES_PATTERN, '_'); // Collapse consecutive underscores

  sanitized = toCamelCase(sanitized);

  // Ensure identifier starts with letter or underscore (Nix requirement)
  if (isEmpty(sanitized) || !VALID_IDENTIFIER_START_PATTERN.test(sanitized)) {
    sanitized = LEADING_UNDERSCORE_PREFIX + sanitized;
  }

  return sanitized;
}
