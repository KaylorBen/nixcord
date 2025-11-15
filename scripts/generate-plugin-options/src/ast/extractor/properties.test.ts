import { describe, test, expect } from 'vitest';
import { Project, SyntaxKind, ModuleKind } from 'ts-morph';
import {
  extractStringProperty,
  extractBooleanProperty,
  extractTypeProperty,
} from './properties.js';

function createProject(): Project {
  return new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
      target: 99, // ES2022
      module: ModuleKind.ESNext,
      jsx: 2, // React
      allowJs: true,
      skipLibCheck: true,
    },
  });
}

describe('extractStringProperty()', () => {
  test('returns Maybe<string> correctly', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { name: "test" };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr('')).toBe('test');
  });

  test('handles missing property', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { type: "STRING" };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    expect(result.isNothing).toBe(true);
  });

  test('handles non-PropertyAssignment', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { name() {} };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    expect(result.isNothing).toBe(true);
  });

  test('handles StringLiteral initializer', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { name: "value" };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr('')).toBe('value');
  });

  test('handles non-StringLiteral initializer', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { name: 42 };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    expect(result.isNothing).toBe(true);
  });

  test('handles missing initializer', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { name };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    expect(result.isNothing).toBe(true);
  });

  test('handles simple template literal', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      'const obj = { name: `template-value` };'
    );
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr('')).toBe('template-value');
  });

  test('handles template expression (returns nothing)', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      'const value = "test"; const obj = { name: `value-${value}` };'
    );
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractStringProperty(objLiteral, 'name');
    // Template expressions with substitutions can't be extracted
    expect(result.isNothing).toBe(true);
  });
});

describe('extractBooleanProperty()', () => {
  test('returns Maybe<boolean> correctly', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { hidden: true };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractBooleanProperty(objLiteral, 'hidden');
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(false)).toBe(true);
  });

  test('handles missing property', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { type: "STRING" };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractBooleanProperty(objLiteral, 'hidden');
    expect(result.isNothing).toBe(true);
  });

  test('handles TrueKeyword', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { enabled: true };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractBooleanProperty(objLiteral, 'enabled');
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(false)).toBe(true);
  });

  test('handles FalseKeyword', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { enabled: false };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractBooleanProperty(objLiteral, 'enabled');
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(true)).toBe(false);
  });

  test('handles invalid boolean initializer', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { enabled: "true" };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractBooleanProperty(objLiteral, 'enabled');
    expect(result.isNothing).toBe(true);
  });
});

describe('extractTypeProperty()', () => {
  test('returns Maybe<Node> correctly', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const obj = { type: OptionType.STRING };`
    );
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractTypeProperty(objLiteral);
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(undefined)).toBeDefined();
  });

  test('handles missing property', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { name: "test" };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractTypeProperty(objLiteral);
    expect(result.isNothing).toBe(true);
  });

  test('handles PropertyAccessExpression types', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const obj = { type: OptionType.BOOLEAN };`
    );
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractTypeProperty(objLiteral);
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(undefined)?.getKind()).toBe(SyntaxKind.PropertyAccessExpression);
  });

  test('handles Identifier types', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const obj = { type: SomeType };`);
    const objLiteral = sourceFile
      .getVariableDeclarationOrThrow('obj')
      .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const result = extractTypeProperty(objLiteral);
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(undefined)?.getKind()).toBe(SyntaxKind.Identifier);
  });
});
