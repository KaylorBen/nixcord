/**
 * Pattern matchers for call expression-based select patterns.
 *
 * Detects patterns like:
 * - `Array.from(...)`
 * - Generic call expressions
 */

import type { Node, CallExpression, PropertyAccessExpression } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { asKind } from '../../../utils/node-helpers.js';
import { METHOD_NAME_FROM, GLOBAL_ARRAY_NAME } from '../../constants.js';

/**
 * Checks if a call expression is `Array.from()`.
 */
export function isArrayFromCall(call: Node): boolean {
  if (call.getKind() !== SyntaxKind.CallExpression) {
    return false;
  }

  const callExpr = call.asKindOrThrow(SyntaxKind.CallExpression);
  const expr = callExpr.getExpression();
  const propAccess = asKind<PropertyAccessExpression>(
    expr,
    SyntaxKind.PropertyAccessExpression
  ).unwrapOr(undefined);

  if (!propAccess) {
    return false;
  }

  const base = propAccess.getExpression();
  const isArrayBase =
    base?.getKind() === SyntaxKind.Identifier &&
    base.asKindOrThrow(SyntaxKind.Identifier).getText() === GLOBAL_ARRAY_NAME;

  return isArrayBase && propAccess.getName() === METHOD_NAME_FROM;
}

/**
 * Checks if a node is a call expression.
 */
export function isCallExpression(node: Node): node is CallExpression {
  return node.getKind() === SyntaxKind.CallExpression;
}
