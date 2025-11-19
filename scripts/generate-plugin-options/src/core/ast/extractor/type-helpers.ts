import type { ObjectLiteralExpression, Node } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { match, P } from 'ts-pattern';
import { TYPE_PROPERTY, DEFAULT_PROPERTY, OPTION_TYPE_CUSTOM } from './constants.js';
import type { SettingProperties } from './type-inference/index.js';
import { getPropertyInitializer } from '../utils/node-helpers.js';

/**
 * Grab the node used as `default:` so callers can analyze it without repeating the property lookup.
 */
export function getDefaultPropertyInitializer(obj: ObjectLiteralExpression): Node | undefined {
  return getPropertyInitializer(obj, DEFAULT_PROPERTY).unwrapOr(undefined);
}

/**
 * Determine whether a setting explicitly declares `OptionType.CUSTOM`. We look at both the raw
 * property inside the object literal and the previously parsed `props.typeNode` because some
 * plugins only set one or the other.
 */
export function isCustomType(valueObj: ObjectLiteralExpression, props: SettingProperties): boolean {
  // Most plugins set `type: OptionType.CUSTOM` directly; inspect that first
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

  // Some settings omit the literal type property but still carry a type annotation; fall back to it
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
 * Quick helper used by the coercion logic to tell whether `default:` is a literal string.
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
