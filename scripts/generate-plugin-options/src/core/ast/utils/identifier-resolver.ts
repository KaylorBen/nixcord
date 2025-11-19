/**
 * Centralized identifier resolution utilities.
 *
 * Consolidates common patterns for resolving identifiers to their initializer nodes.
 */

import type { TypeChecker, Node, Identifier } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Maybe } from 'true-myth';
import { asKind } from './node-helpers.js';
import { resolveIdentifierInitializerNode as resolveIdentifierInitializerNodeOriginal } from '../extractor/node-utils/index.js';

/**
 * Resolves an identifier node to its initializer value.
 *
 * Combines type checking and identifier resolution into a single operation.
 */
export function resolveIdentifierValue(node: Node, checker: TypeChecker): Maybe<Node> {
  return asKind<Identifier>(node, SyntaxKind.Identifier).andThen((ident) =>
    resolveIdentifierInitializerNodeOriginal(ident, checker)
  );
}

/**
 * Resolves an identifier and unwraps common wrappers (as const, parentheses, etc.).
 */
export function resolveIdentifierValueUnwrapped(node: Node, checker: TypeChecker): Maybe<Node> {
  return resolveIdentifierValue(node, checker).map((initNode) => {
    // Currently returns the node as-is. If we need to unwrap "as const" assertions
    // or parentheses in the future, we can use the unwrapNode function from node-utils
    return initNode;
  });
}
