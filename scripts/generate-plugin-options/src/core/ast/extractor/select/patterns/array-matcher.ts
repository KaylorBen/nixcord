/**
 * Pattern matchers for array-based select patterns.
 *
 * Detects patterns like:
 * - `[].map(...)`
 * - `Array.from(...)`
 */

import type { Node, ArrayLiteralExpression, CallExpression } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { METHOD_NAME_MAP } from '../../constants.js';

/**
 * Checks if a node is an array literal expression.
 */
export function isArrayLiteral(node: Node): node is ArrayLiteralExpression {
  return node.getKind() === SyntaxKind.ArrayLiteralExpression;
}

/**
 * Checks if a call expression is a `.map()` call.
 */
export function isMapCall(call: CallExpression): boolean {
  const expr = call.getExpression();
  if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) {
    return false;
  }
  const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
  return propAccess.getName() === METHOD_NAME_MAP;
}

/**
 * Checks if a call expression is targeting an array literal.
 * Pattern: `[...].map(...)`
 */
export function isArrayMapCall(call: CallExpression): boolean {
  if (!isMapCall(call)) {
    return false;
  }
  const expr = call.getExpression();
  const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
  const target = propAccess.getExpression();
  return isArrayLiteral(target);
}
