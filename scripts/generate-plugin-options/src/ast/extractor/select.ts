import type {
  TypeChecker,
  ObjectLiteralExpression,
  Node,
  ArrayLiteralExpression,
  CallExpression,
  AsExpression,
  Identifier,
  PropertyAccessExpression,
} from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { Result, Maybe } from 'true-myth';
import { pipe, find, filter, map, partition, isEmpty } from 'remeda';
import { map as iterMap, toArray as iterToArray, some } from 'iter-tools';
import { match } from 'ts-pattern';
import {
  isMethodCall,
  getFirstArgumentOfKind,
  iteratePropertyAssignments,
  getPropertyAssignment,
  getPropertyName,
  asKind,
} from '../utils/node-helpers.js';
import {
  unwrapNode,
  resolveIdentifierInitializerNode,
  evaluateThemesValues,
} from './node-utils.js';
import {
  OPTIONS_PROPERTY,
  VALUE_PROPERTY,
  LABEL_PROPERTY,
  DEFAULT_PROPERTY,
  METHOD_NAME_KEYS,
  METHOD_NAME_VALUES,
  METHOD_NAME_FROM,
  METHOD_NAME_MAP,
  GLOBAL_ARRAY_NAME,
} from './constants.js';
import type { EnumLiteral } from './constants.js';
import { resolveEnumLikeValue } from './enum-resolver.js';
import type {
  SelectOptionsResult,
  SelectDefaultResult,
  EnumValueResult,
  ExtractionError,
} from './types.js';
import { createExtractionError, ExtractionErrorKind } from './types.js';

function extractOptionsFromArrayMap(arr: Node, checker: TypeChecker): SelectOptionsResult {
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

  // Use Remeda partition to separate Ok and Err results
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

function extractOptionsFromObjectKeysMap(call: Node, checker: TypeChecker): SelectOptionsResult {
  const innerCall = asKind<CallExpression>(call, SyntaxKind.CallExpression).unwrapOr(undefined);
  if (!innerCall) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.InvalidNodeType,
        'Expected CallExpression for Object.keys()',
        call
      )
    );
  }

  const keysMethod = isMethodCall(innerCall, METHOD_NAME_KEYS).unwrapOr(undefined);
  if (!keysMethod) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnsupportedPattern,
        'Expected Object.keys() pattern',
        call
      )
    );
  }

  const innerTarget = getFirstArgumentOfKind(innerCall, SyntaxKind.Identifier).unwrapOr(undefined);
  if (!innerTarget) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnresolvableSymbol,
        'Object.keys() argument must be an identifier',
        call
      )
    );
  }

  const ident = innerTarget;
  const init = resolveIdentifierInitializerNode(ident, checker);

  // Handle as const pattern: const obj = { ... } as const
  const objLiteral = init.andThen((node) => {
    const asExpr = asKind<AsExpression>(node, SyntaxKind.AsExpression).unwrapOr(undefined);
    if (asExpr) {
      return Maybe.just(unwrapNode(asExpr.getExpression()));
    }
    return Maybe.just(node);
  });

  if (objLiteral.isNothing || objLiteral.value.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnresolvableSymbol,
        `Cannot resolve identifier ${ident.getText()} to object literal`,
        ident
      )
    );
  }

  const obj = objLiteral.value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  const keys = pipe(
    Array.from(iteratePropertyAssignments(obj)),
    map((p) => getPropertyName(p).unwrapOr(''))
  );
  return Result.ok({
    values: Object.freeze(keys),
    labels: Object.freeze({}),
  });
}

function extractOptionsFromThemePattern(
  target: Node,
  call: Node,
  checker: TypeChecker
): SelectOptionsResult {
  const ident = asKind<Identifier>(target, SyntaxKind.Identifier).unwrapOr(undefined);
  if (!ident) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.InvalidNodeType,
        'Expected Identifier for theme pattern',
        target
      )
    );
  }

  const callExpr = asKind<CallExpression>(call, SyntaxKind.CallExpression).unwrapOr(undefined);
  if (!callExpr) {
    return Result.err(
      createExtractionError(ExtractionErrorKind.InvalidNodeType, 'Expected CallExpression', call)
    );
  }

  // Check arrow function body for themes[param] pattern
  const args = callExpr.getArguments();
  if (!isEmpty(args)) {
    const firstArg = args[0];
    const arrowFunc = firstArg
      ? asKind<import('ts-morph').ArrowFunction>(firstArg, SyntaxKind.ArrowFunction).unwrapOr(
          undefined
        )
      : undefined;

    if (arrowFunc) {
      let body = arrowFunc.getBody();
      if (body) body = unwrapNode(body);
      const obj = body
        ? asKind<ObjectLiteralExpression>(body, SyntaxKind.ObjectLiteralExpression).unwrapOr(
            undefined
          )
        : undefined;

      if (obj) {
        const valueProp = getPropertyAssignment(obj, VALUE_PROPERTY).unwrapOr(undefined);
        if (valueProp) {
          const vinit = valueProp.getInitializer();
          // Check for ElementAccessExpression pattern
          if (vinit && vinit.getKind() === SyntaxKind.ElementAccessExpression) {
            const ea = vinit.asKindOrThrow(SyntaxKind.ElementAccessExpression);
            const themesExpr = ea.getExpression();
            const themesIdent = asKind<Identifier>(themesExpr, SyntaxKind.Identifier).unwrapOr(
              undefined
            );
            if (themesIdent) {
              const values = evaluateThemesValues(themesIdent, checker);
              if (!isEmpty(values))
                return Result.ok({
                  values: Object.freeze(values),
                  labels: Object.freeze({}),
                });
            }
          }
        }
      }
    }
  }

  // Enhanced: check if the identifier itself is Object.keys(themes) or resolves to it
  const identInit = resolveIdentifierInitializerNode(ident, checker);
  if (identInit.isJust) {
    const initNode = identInit.value;
    // Handle direct Object.keys(themes) call
    const ic = asKind<CallExpression>(initNode, SyntaxKind.CallExpression).unwrapOr(undefined);
    if (ic) {
      const keysMethod = isMethodCall(ic, METHOD_NAME_KEYS).unwrapOr(undefined);
      if (keysMethod) {
        const arg0 = getFirstArgumentOfKind(ic, SyntaxKind.Identifier).unwrapOr(undefined);
        if (arg0) {
          // Try to evaluate themes values from the identifier
          const evaluated = evaluateThemesValues(arg0, checker);
          if (!isEmpty(evaluated))
            return Result.ok({
              values: Object.freeze(evaluated),
              labels: Object.freeze({}),
            });

          // Fallback: try to extract keys from the object literal itself
          const objInit = resolveIdentifierInitializerNode(arg0, checker);
          const obj = objInit
            .andThen((node) =>
              asKind<ObjectLiteralExpression>(node, SyntaxKind.ObjectLiteralExpression)
            )
            .unwrapOr(undefined);

          if (obj) {
            const keys = pipe(
              Array.from(iteratePropertyAssignments(obj)),
              map((p) => getPropertyName(p).unwrapOr(''))
            );
            if (!isEmpty(keys))
              return Result.ok({
                values: Object.freeze(keys),
                labels: Object.freeze({}),
              });
          }
        }
      }
    }

    // Handle type assertion pattern: Object.keys(themes) as (keyof typeof themes)[]
    const asExpr = asKind<AsExpression>(initNode, SyntaxKind.AsExpression).unwrapOr(undefined);
    if (asExpr) {
      const expr = unwrapNode(asExpr.getExpression());
      const ic = asKind<CallExpression>(expr, SyntaxKind.CallExpression).unwrapOr(undefined);
      if (ic) {
        const keysMethod = isMethodCall(ic, METHOD_NAME_KEYS).unwrapOr(undefined);
        if (keysMethod) {
          const arg0 = getFirstArgumentOfKind(ic, SyntaxKind.Identifier).unwrapOr(undefined);
          if (arg0) {
            const evaluated = evaluateThemesValues(arg0, checker);
            if (!isEmpty(evaluated))
              return Result.ok({
                values: Object.freeze(evaluated),
                labels: Object.freeze({}),
              });

            // Fallback: extract keys
            const objInit = resolveIdentifierInitializerNode(arg0, checker);
            const obj = objInit
              .andThen((node) =>
                asKind<ObjectLiteralExpression>(node, SyntaxKind.ObjectLiteralExpression)
              )
              .unwrapOr(undefined);

            if (obj) {
              const keys = pipe(
                Array.from(iteratePropertyAssignments(obj)),
                map((p) => getPropertyName(p).unwrapOr(''))
              );
              if (!isEmpty(keys))
                return Result.ok({
                  values: Object.freeze(keys),
                  labels: Object.freeze({}),
                });
            }
          }
        }
      }
    }
  }

  return Result.err(
    createExtractionError(
      ExtractionErrorKind.UnsupportedPattern,
      'Theme pattern not recognized',
      target
    )
  );
}

function extractOptionsFromObjectValuesMap(call: Node, checker: TypeChecker): SelectOptionsResult {
  const innerCall = asKind<CallExpression>(call, SyntaxKind.CallExpression).unwrapOr(undefined);
  if (!innerCall) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.InvalidNodeType,
        'Expected CallExpression for Object.values()',
        call
      )
    );
  }

  const valuesMethod = isMethodCall(innerCall, METHOD_NAME_VALUES).unwrapOr(undefined);
  if (!valuesMethod) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnsupportedPattern,
        'Expected Object.values() pattern',
        call
      )
    );
  }

  const innerTarget = getFirstArgumentOfKind(innerCall, SyntaxKind.Identifier).unwrapOr(undefined);
  if (!innerTarget) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnresolvableSymbol,
        'Object.values() argument must be an identifier',
        call
      )
    );
  }

  const ident = innerTarget;
  const init = resolveIdentifierInitializerNode(ident, checker);

  // Handle as const pattern: const obj = { ... } as const
  const objLiteral = init.andThen((node) => {
    const asExpr = asKind<AsExpression>(node, SyntaxKind.AsExpression).unwrapOr(undefined);
    if (asExpr) {
      return Maybe.just(unwrapNode(asExpr.getExpression()));
    }
    return Maybe.just(node);
  });

  if (objLiteral.isNothing || objLiteral.value.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnresolvableSymbol,
        `Cannot resolve identifier ${ident.getText()} to object literal`,
        ident
      )
    );
  }

  const obj = objLiteral.value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  const values = pipe(
    obj.getProperties(),
    filter((p) => p.getKind() === SyntaxKind.PropertyAssignment),
    map((p) => {
      const propAssign = p.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const init = propAssign.getInitializer();
      if (!init) return null;
      const resolved = resolveEnumLikeValue(init, checker);
      return resolved.isOk ? resolved.value : null;
    }),
    filter((val): val is EnumLiteral => val !== null)
  );
  return Result.ok({
    values: Object.freeze(values),
    labels: Object.freeze({}),
  });
}

function extractOptionsFromArrayFrom(call: Node, checker: TypeChecker): SelectOptionsResult {
  const callExpr = asKind<CallExpression>(call, SyntaxKind.CallExpression).unwrapOr(undefined);
  if (!callExpr) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.InvalidNodeType,
        'Expected CallExpression for Array.from()',
        call
      )
    );
  }

  const expr = callExpr.getExpression();
  const propAccess = asKind<PropertyAccessExpression>(
    expr,
    SyntaxKind.PropertyAccessExpression
  ).unwrapOr(undefined);
  const base = propAccess?.getExpression();
  const fromMethod =
    propAccess &&
    base?.getKind() === SyntaxKind.Identifier &&
    base.asKindOrThrow(SyntaxKind.Identifier).getText() === GLOBAL_ARRAY_NAME &&
    propAccess.getName() === METHOD_NAME_FROM
      ? propAccess
      : undefined;

  if (!fromMethod) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnsupportedPattern,
        'Expected Array.from() pattern',
        call
      )
    );
  }

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

  // Handle Array.from(arrayLike) where arrayLike is an array literal
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

  // Handle Array.from(identifier) where identifier resolves to an array
  const ident = asKind<Identifier>(firstArg, SyntaxKind.Identifier).unwrapOr(undefined);
  if (ident) {
    const init = resolveIdentifierInitializerNode(ident, checker);
    const arr = init
      .andThen((node) => asKind<ArrayLiteralExpression>(node, SyntaxKind.ArrayLiteralExpression))
      .unwrapOr(undefined);
    if (arr) {
      const results = pipe(
        arr.getElements(),
        iterMap((el) => resolveEnumLikeValue(el, checker)),
        iterToArray
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
  }

  return Result.err(
    createExtractionError(
      ExtractionErrorKind.UnsupportedPattern,
      'Array.from() pattern not supported for this argument type',
      call
    )
  );
}

function extractOptionsFromCallExpression(call: Node, checker: TypeChecker): SelectOptionsResult {
  const callExpr = asKind<CallExpression>(call, SyntaxKind.CallExpression).unwrapOr(undefined);
  if (!callExpr) {
    return Result.err(
      createExtractionError(ExtractionErrorKind.InvalidNodeType, 'Expected CallExpression', call)
    );
  }
  const expr = callExpr.getExpression();

  // Handle Array.from() pattern
  const propExpr = asKind<PropertyAccessExpression>(
    expr,
    SyntaxKind.PropertyAccessExpression
  ).unwrapOr(undefined);
  const arrayFromResult =
    propExpr && propExpr.getName() === METHOD_NAME_FROM
      ? extractOptionsFromArrayFrom(call, checker)
      : Result.err(
          createExtractionError(
            ExtractionErrorKind.UnsupportedPattern,
            'Expected PropertyAccessExpression (e.g., .map())',
            call
          )
        );

  if (arrayFromResult.isOk) return arrayFromResult;

  const propExprForMap = asKind<PropertyAccessExpression>(
    expr,
    SyntaxKind.PropertyAccessExpression
  ).unwrapOr(undefined);
  if (!propExprForMap) {
    return arrayFromResult;
  }

  if (propExprForMap.getName() !== METHOD_NAME_MAP) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.UnsupportedPattern,
        `Expected .map() call, got .${propExprForMap.getName()}()`,
        call
      )
    );
  }

  const target = propExprForMap.getExpression();

  // Handle array.map() pattern
  const arrayResult = extractOptionsFromArrayMap(target, checker);
  if (arrayResult.isOk) return arrayResult;

  // Handle Object.keys(obj).map() and Object.values(obj).map() patterns
  const callExpressionResult = match(target.getKind())
    .with(SyntaxKind.CallExpression, () => {
      const keysResult = extractOptionsFromObjectKeysMap(target, checker);
      if (keysResult.isOk) return keysResult;

      const valuesResult = extractOptionsFromObjectValuesMap(target, checker);
      if (valuesResult.isOk) return valuesResult;

      return Result.err(
        createExtractionError(
          ExtractionErrorKind.UnsupportedPattern,
          'Unsupported map() pattern',
          call
        )
      );
    })
    .otherwise(() =>
      Result.err(
        createExtractionError(
          ExtractionErrorKind.UnsupportedPattern,
          'Unsupported map() pattern',
          call
        )
      )
    );

  if (callExpressionResult.isOk) return callExpressionResult;

  // Handle theme patterns
  const themeResult = extractOptionsFromThemePattern(target, call, checker);
  if (themeResult.isOk) return themeResult;

  return Result.err(
    createExtractionError(ExtractionErrorKind.UnsupportedPattern, 'Unsupported map() pattern', call)
  );
}

function extractValueFromObjectLiteral(
  objExpr: ObjectLiteralExpression,
  checker: TypeChecker
): EnumValueResult {
  const valueProp = getPropertyAssignment(objExpr, VALUE_PROPERTY).unwrapOr(undefined);
  if (!valueProp) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.MissingProperty,
        `Missing 'value' property in object literal`,
        objExpr
      )
    );
  }

  const valueInitializer = valueProp.getInitializer();
  if (!valueInitializer) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.MissingProperty,
        `'value' property has no initializer`,
        valueProp
      )
    );
  }

  return resolveEnumLikeValue(valueInitializer, checker);
}

interface ValueAndLabel {
  value: EnumLiteral;
  label?: string;
}

function extractValueAndLabelFromObjectLiteral(
  objExpr: ObjectLiteralExpression,
  checker: TypeChecker
): Result<ValueAndLabel, ExtractionError> {
  const valueResult = extractValueFromObjectLiteral(objExpr, checker);
  if (valueResult.isErr) {
    return Result.err(valueResult.error);
  }

  const labelProp = getPropertyAssignment(objExpr, LABEL_PROPERTY).unwrapOr(undefined);
  let label: string | undefined;
  if (labelProp) {
    const labelInitializer = labelProp.getInitializer();
    if (labelInitializer && labelInitializer.getKind() === SyntaxKind.StringLiteral) {
      label = labelInitializer.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
    }
  }

  return Result.ok(
    label !== undefined ? { value: valueResult.value, label } : { value: valueResult.value }
  );
}

function extractOptionsFromArrayLiteral(
  arrayExpr: Node,
  checker: TypeChecker
): SelectOptionsResult {
  const arr = asKind<ArrayLiteralExpression>(arrayExpr, SyntaxKind.ArrayLiteralExpression).unwrapOr(
    undefined
  );
  if (!arr) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.InvalidNodeType,
        'Expected ArrayLiteralExpression',
        arrayExpr
      )
    );
  }

  const enumValues: EnumLiteral[] = [];
  const labels: Record<string, string> & Partial<Record<number, string>> = {} as any;
  const errors: string[] = [];

  // If the array has object elements, we only extract from objects (not direct literals)
  const hasObjectElements = some(
    (el: Node) => el.getKind() === SyntaxKind.ObjectLiteralExpression,
    arr.getElements()
  );

  for (const element of arr.getElements()) {
    match(element.getKind())
      .with(SyntaxKind.StringLiteral, SyntaxKind.NumericLiteral, () => {
        if (!hasObjectElements) {
          const resolved = resolveEnumLikeValue(element, checker);
          match(resolved)
            .with({ isOk: true }, (r) => enumValues.push(r.value))
            .with({ isOk: false }, (r) => errors.push(r.error.message))
            .exhaustive();
        }
      })
      .with(SyntaxKind.ObjectLiteralExpression, () => {
        const obj = asKind<ObjectLiteralExpression>(
          element,
          SyntaxKind.ObjectLiteralExpression
        ).unwrapOr(undefined);
        if (!obj) return;
        const resolved = extractValueAndLabelFromObjectLiteral(obj, checker);
        match(resolved)
          .with({ isOk: true }, (r) => {
            enumValues.push(r.value.value);
            if (r.value.label !== undefined) {
              const key =
                typeof r.value.value === 'boolean' ? String(r.value.value) : r.value.value;
              (labels as any)[key] = r.value.label;
            }
          })
          .with({ isOk: false }, (r) => errors.push(r.error.message))
          .exhaustive();
      })
      .with(SyntaxKind.SpreadElement, () => {
        const spread = asKind<import('ts-morph').SpreadElement>(
          element,
          SyntaxKind.SpreadElement
        ).unwrapOr(undefined);
        if (!spread) return;
        const expr = spread.getExpression();
        const ident = asKind<Identifier>(expr, SyntaxKind.Identifier).unwrapOr(undefined);
        if (ident) {
          const symbol = ident.getSymbol() ?? checker.getSymbolAtLocation(ident);
          const valueDecl = symbol?.getValueDeclaration();
          const init =
            valueDecl && 'getInitializer' in valueDecl
              ? (valueDecl as { getInitializer: () => Node | undefined }).getInitializer()
              : undefined;
          const spreadArray = init
            ? asKind<ArrayLiteralExpression>(init, SyntaxKind.ArrayLiteralExpression).unwrapOr(
                undefined
              )
            : undefined;
          if (spreadArray) {
            pipe(
              spreadArray.getElements(),
              filter((spreadElem) => spreadElem.getKind() === SyntaxKind.ObjectLiteralExpression),
              map((spreadElem) => {
                const obj = asKind<ObjectLiteralExpression>(
                  spreadElem,
                  SyntaxKind.ObjectLiteralExpression
                ).unwrapOr(undefined);
                if (!obj) return;
                const resolved = extractValueAndLabelFromObjectLiteral(obj, checker);
                match(resolved)
                  .with({ isOk: true }, (r) => {
                    enumValues.push(r.value.value);
                    if (r.value.label !== undefined) {
                      const key =
                        typeof r.value.value === 'boolean' ? String(r.value.value) : r.value.value;
                      labels[key] = r.value.label;
                    }
                  })
                  .with({ isOk: false }, (r) => errors.push(r.error.message))
                  .exhaustive();
              })
            );
          }
        }
      })
      .otherwise(() => {
        // No-op: element kind not handled
      });
  }

  if (!isEmpty(errors) && isEmpty(enumValues)) {
    return Result.err(
      createExtractionError(
        ExtractionErrorKind.CannotEvaluate,
        `Failed to extract options from array: ${errors.join('; ')}`,
        arrayExpr
      )
    );
  }

  return Result.ok({
    values: Object.freeze(enumValues),
    labels: Object.freeze(labels),
  });
}

/**
 * Extracts the available options for a SELECT type setting.
 *
 * Handles various patterns:
 * - Array of objects: `options: [{ value: "a" }, { value: "b" }]`
 * - Array literals: `options: ["a", "b"]` (when no object elements present)
 * - Spread arrays: `options: [...array, { value: "c" }]`
 * - Object.keys().map(): `options: Object.keys(obj).map(...)` extracts object keys
 * - Array.map(): `options: ["a", "b"].map(n => ({ value: n }))` extracts array values
 * - Theme patterns: `options: themeNames.map(name => ({ value: themes[name] }))` evaluates theme URLs
 *
 * Limitations: Object.keys() on external objects may not resolve, complex map functions
 * may not be fully evaluated, and only the `value` property is extracted (ignores `label` and `default`).
 */
export function extractSelectOptions(
  node: ObjectLiteralExpression,
  checker: TypeChecker
): SelectOptionsResult {
  const prop = node.getProperty(OPTIONS_PROPERTY);
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) {
    return Result.ok({
      values: Object.freeze([]),
      labels: Object.freeze({}),
    });
  }

  const initializer = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
  if (!initializer) {
    return Result.ok({
      values: Object.freeze([]),
      labels: Object.freeze({}),
    });
  }

  const initUnwrapped = unwrapNode(initializer);

  // Try Array.from() pattern first (not a map pattern)
  if (initUnwrapped.getKind() === SyntaxKind.CallExpression) {
    const arrayFromResult = extractOptionsFromArrayFrom(initUnwrapped, checker);
    if (arrayFromResult.isOk) return arrayFromResult;
    // If Array.from() fails, continue to try other patterns
  }

  // Try call expression patterns (map, Object.keys, etc.)
  if (initUnwrapped.getKind() === SyntaxKind.CallExpression) {
    const result = extractOptionsFromCallExpression(initUnwrapped, checker);
    if (result.isOk) return result;
    // If call expression fails, gracefully fall back to empty array (old behavior)
    // This matches the test expectation: "currently returns empty when unresolved"
    return Result.ok({
      values: Object.freeze([]),
      labels: Object.freeze({}),
    });
  }

  // Fall back to array literal extraction
  return extractOptionsFromArrayLiteral(initUnwrapped, checker);
}

function extractDefaultFromArrayMap(
  arr: Node,
  call: Node,
  checker: TypeChecker
): SelectDefaultResult {
  return match(arr.getKind())
    .with(SyntaxKind.ArrayLiteralExpression, () => {
      const arrayExpr = arr.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
      const callExpr = call.asKindOrThrow(SyntaxKind.CallExpression);
      const args = callExpr.getArguments();
      const firstArg = args[0];

      const defaultFromArrowFunction = match([!isEmpty(args), firstArg?.getKind()] as const)
        .with([true, SyntaxKind.ArrowFunction], () => {
          if (!firstArg) return Result.ok(undefined);
          const body = firstArg.asKindOrThrow(SyntaxKind.ArrowFunction).getBody();
          return match(body?.getKind())
            .with(SyntaxKind.ObjectLiteralExpression, () => {
              if (!body) return Result.ok(undefined);
              const obj = body.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
              const defProp = obj.getProperty(DEFAULT_PROPERTY);
              return match(defProp?.getKind())
                .with(SyntaxKind.PropertyAssignment, () => {
                  if (!defProp) return Result.ok(undefined);
                  const din = defProp.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
                  return match(din?.getKind())
                    .with(SyntaxKind.BinaryExpression, () => {
                      if (!din) return Result.ok(undefined);
                      // Extract default from patterns like default: n === "value"
                      // We take the right side of the comparison as the default value
                      const bin = din.asKindOrThrow(SyntaxKind.BinaryExpression);
                      const right = bin.getRight();
                      const val = resolveEnumLikeValue(right, checker);
                      return match(val)
                        .with({ isOk: true }, (r) => Result.ok(r.value))
                        .with({ isOk: false }, () => Result.ok(undefined))
                        .exhaustive();
                    })
                    .otherwise(() => Result.ok(undefined));
                })
                .otherwise(() => Result.ok(undefined));
            })
            .otherwise(() => Result.ok(undefined));
        })
        .otherwise(() => Result.ok(undefined));

      const defaultResult = defaultFromArrowFunction;
      if (defaultResult.isOk && defaultResult.value !== undefined) {
        return defaultResult;
      }

      // Fallback to first array element if we can't extract from the comparison
      const first = arrayExpr.getElements()[0];
      if (first) {
        const val = resolveEnumLikeValue(first, checker);
        return match(val)
          .with({ isOk: true }, (r) => Result.ok(r.value))
          .with({ isOk: false }, () => Result.ok(undefined))
          .exhaustive();
      }
      return Result.ok(undefined);
    })
    .otherwise(() => Result.ok(undefined));
}

function extractDefaultFromIdentifierMap(
  target: Node,
  call: Node,
  checker: TypeChecker
): SelectDefaultResult {
  return match(target.getKind())
    .with(SyntaxKind.Identifier, () => {
      const callExpr = call.asKindOrThrow(SyntaxKind.CallExpression);
      const args = callExpr.getArguments();
      const firstArg = args[0];

      return match([!isEmpty(args), firstArg?.getKind()] as const)
        .with([true, SyntaxKind.ArrowFunction], () => {
          if (!firstArg) return Result.ok(undefined);
          const cb = firstArg.asKindOrThrow(SyntaxKind.ArrowFunction);
          let body = cb.getBody();
          if (body) body = unwrapNode(body);
          return match(body?.getKind())
            .with(SyntaxKind.ObjectLiteralExpression, () => {
              if (!body) return Result.ok(undefined);
              const obj = body.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
              const defProp = obj.getProperty(DEFAULT_PROPERTY);
              return match(defProp?.getKind())
                .with(SyntaxKind.PropertyAssignment, () => {
                  if (!defProp) return Result.ok(undefined);
                  const din = defProp.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
                  return match(din?.getKind())
                    .with(SyntaxKind.BinaryExpression, () => {
                      if (!din) return Result.ok(undefined);
                      const bin = din.asKindOrThrow(SyntaxKind.BinaryExpression);
                      const right = bin.getRight();
                      const val = resolveEnumLikeValue(right, checker);
                      return match(val)
                        .with({ isOk: true }, (r) => Result.ok(r.value))
                        .with({ isOk: false }, () => Result.ok(undefined))
                        .exhaustive();
                    })
                    .otherwise(() => Result.ok(undefined));
                })
                .otherwise(() => Result.ok(undefined));
            })
            .otherwise(() => Result.ok(undefined));
        })
        .otherwise(() => Result.ok(undefined));
    })
    .otherwise(() => Result.ok(undefined));
}

function extractDefaultFromObjectKeysMap(
  keysCall: Node,
  checker: TypeChecker
): SelectDefaultResult {
  if (keysCall.getKind() !== SyntaxKind.CallExpression) {
    return Result.ok(undefined);
  }
  const innerCall = keysCall.asKindOrThrow(SyntaxKind.CallExpression);
  const innerExpr = innerCall.getExpression();
  if (
    innerExpr.getKind() !== SyntaxKind.PropertyAccessExpression ||
    innerExpr.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName() !== METHOD_NAME_KEYS
  ) {
    return Result.ok(undefined);
  }

  const innerTarget = innerCall.getArguments()[0];
  if (!innerTarget || innerTarget.getKind() !== SyntaxKind.Identifier) {
    return Result.ok(undefined);
  }

  const init = resolveIdentifierInitializerNode(innerTarget, checker);
  if (init.isNothing || init.value.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return Result.ok(undefined);
  }

  const obj = init.value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  // For Object.keys(obj).map((key, index) => ({ default: index === ARRAY_FIRST_INDEX }))
  // we return the first key as the default since index ARRAY_FIRST_INDEX means first element
  const firstProp = find(obj.getProperties(), (p) => p.getKind() === SyntaxKind.PropertyAssignment);
  if (!firstProp) {
    return Result.ok(undefined);
  }

  const value = getPropertyName(firstProp.asKindOrThrow(SyntaxKind.PropertyAssignment)).unwrapOr(
    ''
  );
  return Result.ok(value);
}

function extractDefaultFromCallExpression(call: Node, checker: TypeChecker): SelectDefaultResult {
  if (call.getKind() !== SyntaxKind.CallExpression) {
    return Result.ok(undefined);
  }
  const callExpr = call.asKindOrThrow(SyntaxKind.CallExpression);
  const expr = callExpr.getExpression();
  if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) {
    return Result.ok(undefined);
  }

  const propExpr = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
  if (propExpr.getName() !== METHOD_NAME_MAP) {
    return Result.ok(undefined);
  }

  const target = propExpr.getExpression();

  // Handle array.map() pattern
  if (target.getKind() === SyntaxKind.ArrayLiteralExpression) {
    const result = extractDefaultFromArrayMap(target, call, checker);
    if (result.isOk && result.value !== undefined) return result;
  }

  // Handle identifier.map() pattern
  if (target.getKind() === SyntaxKind.Identifier) {
    const result = extractDefaultFromIdentifierMap(target, call, checker);
    if (result.isOk && result.value !== undefined) return result;
  }

  // Handle Object.keys(obj).map() pattern
  if (target.getKind() === SyntaxKind.CallExpression) {
    const result = extractDefaultFromObjectKeysMap(target, checker);
    if (result.isOk && result.value !== undefined) return result;
  }

  return Result.ok(undefined);
}

function findDefaultInArray(arr: readonly Node[], checker: TypeChecker): SelectDefaultResult {
  for (const element of arr) {
    if (element.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const objExpr = element.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const defaultProp = objExpr.getProperty(DEFAULT_PROPERTY);
      if (!defaultProp || defaultProp.getKind() !== SyntaxKind.PropertyAssignment) continue;

      const defaultInit = defaultProp.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
      if (!defaultInit || defaultInit.getKind() !== SyntaxKind.TrueKeyword) continue;

      const valueProp = objExpr.getProperty(VALUE_PROPERTY);
      if (!valueProp || valueProp.getKind() !== SyntaxKind.PropertyAssignment) continue;

      const valueInitializer = valueProp
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializer();
      if (!valueInitializer) continue;

      const resolved = resolveEnumLikeValue(valueInitializer, checker);
      if (resolved.isOk) return Result.ok(resolved.value);
    }

    if (element.getKind() === SyntaxKind.SpreadElement) {
      const spread = element.asKindOrThrow(SyntaxKind.SpreadElement);
      const expr = spread.getExpression();
      if (expr.getKind() === SyntaxKind.Identifier) {
        const init = resolveIdentifierInitializerNode(expr, checker);
        if (init.isJust && init.value.getKind() === SyntaxKind.ArrayLiteralExpression) {
          const spreadArray = init.value.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
          const fromSpread = findDefaultInArray(spreadArray.getElements(), checker);
          if (fromSpread.isOk && fromSpread.value !== undefined) return fromSpread;
        }
      }
    }
  }
  return Result.ok(undefined);
}

function extractDefaultFromArrayLiteral(
  arrayExpr: Node,
  checker: TypeChecker
): SelectDefaultResult {
  if (arrayExpr.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    return Result.ok(undefined);
  }
  const arr = arrayExpr.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
  return findDefaultInArray(arr.getElements(), checker);
}

/**
 * Extracts the default value for a SELECT type setting.
 *
 * Looks for the option marked with `default: true` in the options array. Also handles
 * patterns like:
 * - `options: ["a", "b"].map(n => ({ default: n === "a" }))` extracts the matching value
 * - `options: Object.keys(obj).map(...)` returns first key when default is marked by index
 *
 * Limitations: Only finds options explicitly marked with `default: true`, complex default
 * expressions may not be fully evaluated, and falls back to first option for some patterns
 * if default detection fails.
 */
export function extractSelectDefault(
  node: ObjectLiteralExpression,
  checker: TypeChecker
): SelectDefaultResult {
  const prop = node.getProperty(OPTIONS_PROPERTY);
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) {
    return Result.ok(undefined);
  }

  const initializer = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
  if (!initializer) {
    return Result.ok(undefined);
  }

  const initUnwrapped = unwrapNode(initializer);

  // Try call expression patterns first (map, Object.keys, etc.)
  if (initUnwrapped.getKind() === SyntaxKind.CallExpression) {
    const result = extractDefaultFromCallExpression(initUnwrapped, checker);
    if (result.isOk && result.value !== undefined) return result;
  }

  // Fall back to array literal extraction
  return extractDefaultFromArrayLiteral(initUnwrapped, checker);
}
