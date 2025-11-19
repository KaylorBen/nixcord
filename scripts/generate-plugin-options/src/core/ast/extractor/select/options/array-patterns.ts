/**
 * Option extraction for patterns where plugins build select data from arrays (literal `.map()` calls
 * or `Array.from()` helpers). Both Vencord and Equicord lean on these patterns for theme pickers.
 */

import type { TypeChecker, Node, ArrayLiteralExpression, Identifier } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Result } from 'true-myth';
import { pipe, filter, map, partition, isEmpty } from 'remeda';
import { map as iterMap, toArray } from 'iter-tools';
import { asKind } from '../../../utils/node-helpers.js';
import { resolveIdentifierInitializerNode } from '../../node-utils/index.js';
import { resolveEnumLikeValue } from '../../enum-resolver.js';
import type { SelectOptionsResult, EnumValueResult } from '../../types.js';
import { createExtractionError, ExtractionErrorKind } from '../../types.js';
import { isArrayFromCall } from '../patterns/call-matcher.js';

/**
 * Extract options from `[...].map(...)` structures by evaluating each element up front.
 */
export function extractOptionsFromArrayMap(arr: Node, checker: TypeChecker): SelectOptionsResult {
  const arrayExpr = asKind<ArrayLiteralExpression>(arr, SyntaxKind.ArrayLiteralExpression).unwrapOr(
    undefined
  );
  if (!arrayExpr) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.InvalidNodeType,
        'Expected ArrayLiteralExpression',
        arr
      )
    );
  }
  const results = pipe(
    arrayExpr.getElements(),
    map((el) => resolveEnumLikeValue(el, checker))
  );

  // Separate successfully evaluated enum values from failures so we can keep partial results
  const [okResults, errResults] = pipe(
    results,
    partition((result) => result.isOk)
  );

  const values = pipe(
    okResults,
    map((result) => (result as Extract<typeof result, { isOk: true }>).value)
  );
  const errors = pipe(
    errResults,
    map((result) => (result as Extract<typeof result, { isOk: false }>).error.message)
  );

  if (!isEmpty(errors) && isEmpty(values)) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.CannotEvaluate,
        `Failed to extract options: ${errors.join('; ')}`,
        arr
      )
    );
  }

  return Result.ok({
    values: Object.freeze(values),
    labels: Object.freeze({}),
  });
}

/**
 * Extract options from `Array.from()` chains, whether the argument is a literal or an identifier
 * pointing at an array literal.
 */
export function extractOptionsFromArrayFrom(call: Node, checker: TypeChecker): SelectOptionsResult {
  if (!isArrayFromCall(call)) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnsupportedPattern,
        'Expected Array.from() pattern',
        call
      )
    );
  }

  const callExpr = call.asKindOrThrow(SyntaxKind.CallExpression);
  const args = callExpr.getArguments();
  const firstArg = args[0];
  if (!firstArg) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.MissingProperty,
        'Array.from() requires at least one argument',
        call
      )
    );
  }

  // Handle inline literals such as `Array.from([{ label: 'foo' }])`
  const arr = asKind<ArrayLiteralExpression>(firstArg, SyntaxKind.ArrayLiteralExpression).unwrapOr(
    undefined
  );
  if (arr) {
    const results = pipe(
      arr.getElements(),
      map((el) => resolveEnumLikeValue(el, checker))
    );
    const values = pipe(
      results,
      filter((result): result is Extract<typeof result, { isOk: true }> => result.isOk),
      map((result) => result.value)
    );
    return Result.ok({
      values: Object.freeze(values),
      labels: Object.freeze({}),
    });
  }

  // Or identifiers that resolve to array literals (e.g., shared theme lists)
  const ident = asKind<Identifier>(firstArg, SyntaxKind.Identifier).unwrapOr(undefined);
  if (ident) {
    const init = resolveIdentifierInitializerNode(ident, checker);
    const arr = init
      .andThen((node) => asKind<ArrayLiteralExpression>(node, SyntaxKind.ArrayLiteralExpression))
      .unwrapOr(undefined);
    if (arr) {
      const results: EnumValueResult[] = pipe(
        arr.getElements(),
        iterMap((el) => resolveEnumLikeValue(el, checker)),
        toArray
      );
      const values = pipe(
        results,
        filter((result): result is Extract<EnumValueResult, { isOk: true }> => result.isOk),
        map((result) => result.value)
      );
      return Result.ok({
        values: Object.freeze(values),
        labels: Object.freeze({}),
      });
    }
  }

  return Result.err(
    createExtractionError(
      ExtractionErrorKind.UnsupportedPattern,
      'Array.from() pattern not supported for this argument type',
      call
    )
  );
}
