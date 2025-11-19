/**
 * Common value extraction patterns.
 *
 * Consolidates duplicated patterns for extracting values from AST nodes.
 */

import type { TypeChecker, ObjectLiteralExpression } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Maybe } from 'true-myth';
import { getPropertyAssignment } from './node-helpers.js';
import { resolveEnumLikeValue } from '../extractor/enum-resolver.js';
import { VALUE_PROPERTY, LABEL_PROPERTY } from '../extractor/constants.js';
import type { EnumValueResult } from '../extractor/types.js';

/**
 * Extracts a value from an object literal expression's 'value' property.
 *
 * Common pattern used in multiple extractors.
 */
export function extractValueFromObjectLiteral(
  objExpr: ObjectLiteralExpression,
  checker: TypeChecker
): EnumValueResult {
  const valueProp = getPropertyAssignment(objExpr, VALUE_PROPERTY).unwrapOr(undefined);
  if (!valueProp) {
    return resolveEnumLikeValue(objExpr, checker);
  }

  const valueInitializer = valueProp.getInitializer();
  if (!valueInitializer) {
    return resolveEnumLikeValue(objExpr, checker);
  }

  return resolveEnumLikeValue(valueInitializer, checker);
}

/**
 * Extracts value and optional label from an object literal expression.
 *
 * Pattern: { value: "...", label: "..." }
 */
export function extractValueAndLabelFromObjectLiteral(
  objExpr: ObjectLiteralExpression,
  checker: TypeChecker
): Maybe<{ value: unknown; label?: string }> {
  const valueResult = extractValueFromObjectLiteral(objExpr, checker);
  if (valueResult.isErr) {
    return Maybe.nothing();
  }

  const labelProp = getPropertyAssignment(objExpr, LABEL_PROPERTY).unwrapOr(undefined);
  let label: string | undefined;
  if (labelProp) {
    const labelInitializer = labelProp.getInitializer();
    if (labelInitializer?.getKind() === SyntaxKind.StringLiteral) {
      label = labelInitializer.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
    }
  }

  return Maybe.just(
    label !== undefined ? { value: valueResult.value, label } : { value: valueResult.value }
  );
}
