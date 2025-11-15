import { describe, test, expect } from 'vitest';
import { Project, SyntaxKind, ModuleKind } from 'ts-morph';
import {
  unwrapNode,
  resolveIdentifierInitializerNode,
  resolveCallExpressionReturn,
  evaluateThemesValues,
} from './node-utils.js';

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

describe('unwrapNode()', () => {
  test('unwraps AsExpression', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = "test" as string;`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    expect(initializer?.getKind()).toBe(SyntaxKind.AsExpression);
    if (initializer) {
      const unwrapped = unwrapNode(initializer);
      expect(unwrapped.getKind()).toBe(SyntaxKind.StringLiteral);
    }
  });

  test('unwraps ParenthesizedExpression', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = (42);`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    expect(initializer?.getKind()).toBe(SyntaxKind.ParenthesizedExpression);
    if (initializer) {
      const unwrapped = unwrapNode(initializer);
      expect(unwrapped.getKind()).toBe(SyntaxKind.NumericLiteral);
    }
  });

  test('unwraps TypeAssertionExpression', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = <number>42;`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    expect(initializer?.getKind()).toBe(SyntaxKind.TypeAssertionExpression);
    if (initializer) {
      const unwrapped = unwrapNode(initializer);
      expect(unwrapped.getKind()).toBe(SyntaxKind.NumericLiteral);
    }
  });

  test('handles nested wrappers', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const x = (("test" as string) as string);`
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const unwrapped = unwrapNode(initializer);
      expect(unwrapped.getKind()).toBe(SyntaxKind.StringLiteral);
    }
  });

  test('handles deeply nested wrappers', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const x = ((((42 as number) as any) as number) as number);`
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const unwrapped = unwrapNode(initializer);
      expect(unwrapped.getKind()).toBe(SyntaxKind.NumericLiteral);
    }
  });

  test('returns node as-is if not a wrapper', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = 42;`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const unwrapped = unwrapNode(initializer);
      expect(unwrapped).toBe(initializer);
    }
  });
});

describe('resolveIdentifierInitializerNode()', () => {
  test('resolves const identifier to its initializer', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const VALUE = "test"; const x = VALUE;`
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    expect(initializer?.getKind()).toBe(SyntaxKind.Identifier);
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveIdentifierInitializerNode(initializer, checker);
      expect(resolved.isJust).toBe(true);
      const node = resolved.unwrapOr(undefined);
      expect(node?.getKind()).toBe(SyntaxKind.StringLiteral);
      if (node?.getKind() === SyntaxKind.StringLiteral) {
        const stringLiteral = node.asKindOrThrow(SyntaxKind.StringLiteral);
        expect(stringLiteral.getLiteralValue()).toBe('test');
      }
    }
  });

  test('resolves numeric constant', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const COUNT = 42; const x = COUNT;`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveIdentifierInitializerNode(initializer, checker);
      expect(resolved.isJust).toBe(true);
      const node = resolved.unwrapOr(undefined);
      expect(node?.getKind()).toBe(SyntaxKind.NumericLiteral);
    }
  });

  test('returns undefined for non-identifier', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = "test";`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveIdentifierInitializerNode(initializer, checker);
      expect(resolved.isNothing).toBe(true);
    }
  });

  test('returns undefined for unresolved identifier', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = UNKNOWN;`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveIdentifierInitializerNode(initializer, checker);
      expect(resolved.isNothing).toBe(true);
    }
  });
});

describe('resolveCallExpressionReturn()', () => {
  test('resolves arrow function call to body', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const fn = () => ({ a: 1 }); const x = fn();`
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    expect(initializer?.getKind()).toBe(SyntaxKind.CallExpression);
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveCallExpressionReturn(initializer, checker);
      expect(resolved.isJust).toBe(true);
      const node = resolved.unwrapOr(undefined);
      expect(node?.getKind()).toBe(SyntaxKind.ObjectLiteralExpression);
    }
  });

  test('resolves arrow function returning array', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const fn = () => [1, 2, 3]; const x = fn();`
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveCallExpressionReturn(initializer, checker);
      expect(resolved.isJust).toBe(true);
      const node = resolved.unwrapOr(undefined);
      expect(node?.getKind()).toBe(SyntaxKind.ArrayLiteralExpression);
    }
  });

  test('returns undefined for non-call expression', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = 42;`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveCallExpressionReturn(initializer, checker);
      expect(resolved.isNothing).toBe(true);
    }
  });

  test('returns undefined for unresolved function', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = unknownFunc();`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const checker = project.getTypeChecker();
      const resolved = resolveCallExpressionReturn(initializer, checker);
      expect(resolved.isNothing).toBe(true);
    }
  });
});

describe('evaluateThemesValues()', () => {
  test('evaluates simple theme object with string literals', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const themes = { DarkPlus: "dark-plus", LightPlus: "light-plus" };`
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('themes');
    const identifier = varDecl.getNameNode();
    const checker = project.getTypeChecker();
    const values = evaluateThemesValues(identifier, checker);
    expect(values).toEqual(['dark-plus', 'light-plus']);
  });

  test('evaluates theme object with shikiRepoTheme calls', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const SHIKI_REPO = "shikijs/shiki";
      const SHIKI_REPO_COMMIT = "abc123";
      const themes = {
        DarkPlus: shikiRepoTheme("dark-plus"),
        LightPlus: shikiRepoTheme("light-plus")
      };
      `
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('themes');
    const identifier = varDecl.getNameNode();
    const checker = project.getTypeChecker();
    const values = evaluateThemesValues(identifier, checker);
    expect(values.length).toBeGreaterThan(0);
    expect(values[0]).toContain('raw.githubusercontent.com');
    expect(values[0]).toContain('dark-plus');
  });

  test('returns empty array for non-identifier', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const x = "test";`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('x');
    const initializer = varDecl.getInitializer();
    if (initializer) {
      const checker = project.getTypeChecker();
      const values = evaluateThemesValues(initializer, checker);
      expect(values).toEqual([]);
    }
  });

  test('returns empty array for non-object literal', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile('test.ts', `const themes = "not-an-object";`);
    const varDecl = sourceFile.getVariableDeclarationOrThrow('themes');
    const identifier = varDecl.getNameNode();
    const checker = project.getTypeChecker();
    const values = evaluateThemesValues(identifier, checker);
    expect(values).toEqual([]);
  });

  test('filters out null values', () => {
    const project = createProject();
    const sourceFile = project.createSourceFile(
      'test.ts',
      `const themes = { 
        Valid: "valid",
        Invalid: someFunction(),
        AlsoValid: "also-valid"
      };`
    );
    const varDecl = sourceFile.getVariableDeclarationOrThrow('themes');
    const identifier = varDecl.getNameNode();
    const checker = project.getTypeChecker();
    const values = evaluateThemesValues(identifier, checker);
    expect(values).toEqual(['valid', 'also-valid']);
  });
});
