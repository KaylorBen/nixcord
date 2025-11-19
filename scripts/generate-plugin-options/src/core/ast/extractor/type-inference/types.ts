/**
 * Type definitions for type inference.
 */

export interface SettingProperties {
  typeNode: ReturnType<typeof import('../properties.js').extractTypeProperty>;
  description: string | undefined;
  placeholder: string | undefined;
  restartNeeded: boolean;
  hidden: ReturnType<typeof import('../properties.js').extractBooleanProperty>;
  defaultLiteralValue: unknown;
}

export interface TypeInferenceResult {
  finalNixType: string;
  selectEnumValues: readonly (string | number | boolean)[] | undefined;
  defaultValue: unknown;
}

export interface InferenceState {
  finalNixType: string;
  selectEnumValues: readonly (string | number | boolean)[] | undefined;
  defaultValue: unknown;
  hasStringArray: boolean;
  hasIdentifierStringArray: boolean;
  isComponentOrCustom: boolean;
}
