import type { ObjectLiteralExpression, Node } from 'ts-morph';
import { Maybe } from 'true-myth';
import { TYPE_PROPERTY } from './constants.js';
import {
  extractStringLiteralValue,
  extractBooleanLiteralValue,
  getPropertyInitializer,
} from '../utils/node-helpers.js';

/**
 * Extracts a string property from an object literal expression.
 *
 * Only works with string literal values. Returns Maybe.nothing() if the property
 * doesn't exist, isn't a PropertyAssignment, or the initializer isn't a StringLiteral.
 */
export function extractStringProperty(
  node: ObjectLiteralExpression,
  propName: string
): Maybe<string> {
  return extractStringLiteralValue(node, propName);
}

/**
 * Extracts a boolean property from an object literal expression.
 *
 * Only works with boolean keyword values (true or false). Returns Maybe.nothing() if
 * the property doesn't exist, isn't a PropertyAssignment, or the initializer isn't
 * a boolean keyword.
 */
export function extractBooleanProperty(
  node: ObjectLiteralExpression,
  propName: string
): Maybe<boolean> {
  return extractBooleanLiteralValue(node, propName);
}

/**
 * Extracts the type property node from an object literal expression.
 *
 * Returns the actual AST node (PropertyAccessExpression like OptionType.STRING,
 * Identifier, or other expression types) so the caller can inspect it for type inference.
 */
export function extractTypeProperty(node: ObjectLiteralExpression): Maybe<Node> {
  return getPropertyInitializer(node, TYPE_PROPERTY);
}
