/**
 * Generic AST traversal utilities for navigation.
 *
 * These functions handle finding and traversing nodes in the AST without
 * knowing anything about what they're looking for. Pure navigation logic.
 */

import type { Node, ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { iteratePropertyAssignments } from '../utils/node-helpers.js';

/**
 * Finds all property assignments in an object literal expression.
 * Pure navigation function - returns nodes without extracting values.
 */
export function findAllPropertyAssignments(obj: ObjectLiteralExpression): PropertyAssignment[] {
  return Array.from(iteratePropertyAssignments(obj));
}

/**
 * Finds a property assignment by name in an object literal expression.
 * Pure navigation function - returns the node without extracting values.
 */
export function findPropertyAssignment(
  obj: ObjectLiteralExpression,
  propName: string
): PropertyAssignment | undefined {
  for (const prop of iteratePropertyAssignments(obj)) {
    const nameNode = prop.getNameNode();
    const name = nameNode.getText().replace(/['"]/g, '');
    if (name === propName) {
      return prop;
    }
  }
  return undefined;
}

/**
 * Finds all nested object literal expressions within a node.
 * Useful for finding nested settings structures.
 */
export function* findNestedObjectLiterals(node: Node): Generator<ObjectLiteralExpression> {
  if (node.getKind() === SyntaxKind.ObjectLiteralExpression) {
    yield node.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  }

  for (const child of node.getDescendants()) {
    if (child.getKind() === SyntaxKind.ObjectLiteralExpression) {
      yield child.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    }
  }
}
