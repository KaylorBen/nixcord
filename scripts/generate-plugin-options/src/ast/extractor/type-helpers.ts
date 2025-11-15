import type { ObjectLiteralExpression, Node } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { match, P } from 'ts-pattern';
import { TYPE_PROPERTY, DEFAULT_PROPERTY, OPTION_TYPE_CUSTOM } from './constants.js';
import type { SettingProperties } from './type-inference.js';
import { getPropertyInitializer } from '../utils/node-helpers.js';

/**
 * Gets the default property initializer from an object literal expression.
 * Returns undefined if the property doesn't exist or isn't a PropertyAssignment.
 */
export function getDefaultPropertyInitializer(obj: ObjectLiteralExpression): Node | undefined {
  return getPropertyInitializer(obj, DEFAULT_PROPERTY).unwrapOr(undefined);
}

/**
 * Checks if a value object represents a CUSTOM type.
 * Checks both the type property directly and the props.typeNode as fallback.
 */
export function isCustomType(valueObj: ObjectLiteralExpression, props: SettingProperties): boolean {
  // Check type property directly from valueObj (most reliable)
  const typeProp = valueObj.getProperty(TYPE_PROPERTY);
  const typePropCheck = match(typeProp)
    .when(
      (prop): prop is NonNullable<typeof prop> =>
        prop !== undefined && prop.getKind() === SyntaxKind.PropertyAssignment,
      (prop) => {
        const typeInit = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
        if (!typeInit) return false;

        return match(typeInit.getKind())
          .with(SyntaxKind.PropertyAccessExpression, () => {
            const propAccess = typeInit.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
            const nameNode = propAccess.getNameNode();
            return match(nameNode.getKind())
              .with(SyntaxKind.Identifier, () => nameNode.getText() === OPTION_TYPE_CUSTOM)
              .otherwise(() => false);
          })
          .otherwise(() => typeInit.getText().includes(OPTION_TYPE_CUSTOM));
      }
    )
    .otherwise(() => false);

  if (typePropCheck) return true;

  // Also check props.typeNode as fallback
  return match(props.typeNode)
    .when(
      (maybe): maybe is typeof maybe & { isJust: true; value: Node } => maybe.isJust,
      (maybe) => {
        const typeNode = maybe.value;
        const typeNodeText = typeNode.getText();

        if (typeNodeText.includes(OPTION_TYPE_CUSTOM)) return true;

        return match(typeNode.getKind())
          .with(SyntaxKind.PropertyAccessExpression, () => {
            const propAccess = typeNode.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
            const nameNode = propAccess.getNameNode();
            return match(nameNode.getKind())
              .with(SyntaxKind.Identifier, () => nameNode.getText() === OPTION_TYPE_CUSTOM)
              .otherwise(() => false);
          })
          .otherwise(() => false);
      }
    )
    .otherwise(() => false);
}

/**
 * Checks if the default property has a string literal value.
 */
export function hasStringLiteralDefault(obj: ObjectLiteralExpression): boolean {
  const init = getDefaultPropertyInitializer(obj);
  return match(init)
    .when(
      (node): node is Node => node !== undefined,
      (node) =>
        match(node.getKind())
          .with(
            P.union(SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral),
            () => true
          )
          .otherwise(() => false)
    )
    .otherwise(() => false);
}
