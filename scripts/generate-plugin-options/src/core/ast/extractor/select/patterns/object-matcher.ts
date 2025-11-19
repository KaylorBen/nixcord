/**
 * Pattern matchers for object-based select patterns.
 *
 * Detects patterns like:
 * - `Object.keys(obj).map(...)`
 * - `Object.values(obj).map(...)`
 */

import type { CallExpression, Identifier } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { isMethodCall, getFirstArgumentOfKind } from '../../../utils/node-helpers.js';
import { METHOD_NAME_KEYS, METHOD_NAME_VALUES } from '../../constants.js';
import { isMapCall } from './array-matcher.js';

/**
 * Checks if a call expression is `Object.keys()`.
 */
export function isObjectKeysCall(call: CallExpression): boolean {
  return isMethodCall(call, METHOD_NAME_KEYS).isJust;
}

/**
 * Checks if a call expression is `Object.values()`.
 */
export function isObjectValuesCall(call: CallExpression): boolean {
  return isMethodCall(call, METHOD_NAME_VALUES).isJust;
}

/**
 * Checks if a call expression is `Object.keys(obj).map(...)`.
 */
export function isObjectKeysMapCall(call: CallExpression): boolean {
  if (!isMapCall(call)) {
    return false;
  }
  const expr = call.getExpression();
  const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
  const target = propAccess.getExpression();

  if (target.getKind() !== SyntaxKind.CallExpression) {
    return false;
  }

  return isObjectKeysCall(target.asKindOrThrow(SyntaxKind.CallExpression));
}

/**
 * Checks if a call expression is `Object.values(obj).map(...)`.
 */
export function isObjectValuesMapCall(call: CallExpression): boolean {
  if (!isMapCall(call)) {
    return false;
  }
  const expr = call.getExpression();
  const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
  const target = propAccess.getExpression();

  if (target.getKind() !== SyntaxKind.CallExpression) {
    return false;
  }

  return isObjectValuesCall(target.asKindOrThrow(SyntaxKind.CallExpression));
}

/**
 * Gets the identifier argument from an Object.keys() or Object.values() call.
 */
export function getObjectMethodTargetIdentifier(call: CallExpression): Identifier | undefined {
  return getFirstArgumentOfKind<Identifier>(call, SyntaxKind.Identifier).unwrapOr(undefined);
}
