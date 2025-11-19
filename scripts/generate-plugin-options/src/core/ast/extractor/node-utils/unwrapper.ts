/**
 * Node unwrapping utilities.
 *
 * Unwraps common wrappers like parentheses, type assertions, and "as const" expressions.
 */

import type { Node } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { match } from 'ts-pattern';

/**
 * Unwraps common wrappers until the actual value appears.
 *
 * Handles extra parentheses, `as const`, type assertions, etc.
 * Iteratively unwraps until there's nothing left to unwrap.
 */
export function unwrapNode(n: Node): Node {
  let current = n;
  let changed = true;

  // Strip layers like `ParenthesizedExpression`, `AsExpression`, etc., until we reach the core node
  while (changed) {
    changed = false;
    const kind = current.getKind();

    const inner = match(kind)
      .with(
        SyntaxKind.AsExpression,
        SyntaxKind.ParenthesizedExpression,
        SyntaxKind.TypeAssertionExpression,
        () => (current as any).getExpression?.() as Node | undefined
      )
      .otherwise(() => undefined);

    if (inner) {
      current = inner;
      changed = true;
    }
  }

  return current;
}
