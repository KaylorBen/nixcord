/**
 * Generic pattern matching utilities for AST navigation.
 *
 * These functions handle pattern detection without knowing what they're
 * looking for. They're pure navigation functions that return nodes.
 */

import type { SourceFile, CallExpression, PropertyAccessExpression, Identifier } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Maybe } from 'true-myth';
import { find, isIncludedIn } from 'remeda';
import { asKind } from '../utils/node-helpers.js';

/**
 * Generic function to find a call expression by function name.
 * Pure navigation - doesn't know what the call is for.
 */
export function findCallExpressionByName(
  sourceFile: SourceFile,
  functionName: string
): Maybe<CallExpression> {
  const callExpressions = sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression
  ) as CallExpression[];

  const found = find(callExpressions, (callExpr) => {
    const expression = callExpr.getExpression();
    const ident = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);
    return ident?.getText() === functionName;
  });

  return found ? Maybe.just(found) : Maybe.nothing();
}

/**
 * Unwraps chained method calls to find the original call.
 * Handles patterns like `original().chainMethod1().chainMethod2()`.
 *
 * @param callExpr - The outermost call expression
 * @param chainMethodNames - Names of methods that can be chained (e.g., ['withPrivateSettings'])
 * @returns The innermost call expression, or the original if no chain found
 */
export function unwrapChainedCall(
  callExpr: CallExpression,
  chainMethodNames: readonly string[]
): CallExpression {
  let expression = callExpr.getExpression();
  let targetCall: CallExpression = callExpr;

  let propAccess = asKind<PropertyAccessExpression>(
    expression,
    SyntaxKind.PropertyAccessExpression
  ).unwrapOr(undefined);

  while (propAccess) {
    const propName = propAccess.getName();

    if (isIncludedIn(propName, chainMethodNames)) {
      expression = propAccess.getExpression();
      const innerCall = asKind<CallExpression>(expression, SyntaxKind.CallExpression).unwrapOr(
        undefined
      );
      if (innerCall) {
        targetCall = innerCall;
        expression = innerCall.getExpression();
        propAccess = asKind<PropertyAccessExpression>(
          expression,
          SyntaxKind.PropertyAccessExpression
        ).unwrapOr(undefined);
        continue;
      }
    }
    break;
  }

  return targetCall;
}

/**
 * Finds a call expression by name, unwrapping any chained calls.
 * Combines findCallExpressionByName and unwrapChainedCall.
 */
export function findCallExpressionByNameUnwrappingChains(
  sourceFile: SourceFile,
  functionName: string,
  chainMethodNames: readonly string[] = []
): Maybe<CallExpression> {
  const callExpressions = sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression
  ) as CallExpression[];

  for (const callExpr of callExpressions) {
    const unwrapped = unwrapChainedCall(callExpr, chainMethodNames);
    const expression = unwrapped.getExpression();
    const identifier = asKind<Identifier>(expression, SyntaxKind.Identifier).unwrapOr(undefined);

    if (identifier?.getText() === functionName) {
      return Maybe.just(unwrapped);
    }
  }

  return Maybe.nothing();
}
