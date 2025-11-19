import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    maxWorkers: 4,
    pool: 'forks',
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        // Re-export only files (tested indirectly)
        "src/core/ast/extractor/select/default/index.ts",
        "src/core/ast/extractor/select/index.ts",
        "src/core/ast/extractor/select/options/index.ts",
        "src/core/ast/extractor/select/patterns/index.ts",
        "src/core/ast/extractor/node-utils/index.ts",
        "src/core/ast/extractor/type-inference/index.ts",
        "src/core/ast/navigator/index.ts",
        // Constants (no logic to test)
        "src/core/ast/extractor/constants.ts",
        // Configuration (validated at module load)
        "src/shared/config.ts",
        // Logger wrapper (thin wrapper around consola)
        "src/shared/logger.ts",
        // Type definitions (interfaces only)
        "src/core/ast/extractor/types.ts",
        "src/shared/types.ts",
        // Simple factory functions
        "src/core/parser/plugin-source.ts",
        // Individual check files (covered by consolidated test)
        "src/core/ast/extractor/default-value-checks/array-checks.ts",
        "src/core/ast/extractor/default-value-checks/index.ts",
        "src/core/ast/extractor/default-value-checks/type-checks.ts",
        // Individual pattern files (covered by consolidated test)
        "src/core/ast/extractor/select/patterns/array-matcher.ts",
        "src/core/ast/extractor/select/patterns/call-matcher.ts",
        "src/core/ast/extractor/select/patterns/object-matcher.ts",
        // Individual type-inference files (covered by consolidated test)
        "src/core/ast/extractor/type-inference/array-inference.ts",
        "src/core/ast/extractor/type-inference/component-coercion.ts",
        "src/core/ast/extractor/type-inference/fallbacks.ts",
        "src/core/ast/extractor/type-inference/initial.ts",
        "src/core/ast/extractor/type-inference/types.ts",
        // Core extraction logic (covered by settings-extractor tests)
        "src/core/ast/extractor/settings-extractor-core.ts",
        // Test files themselves
        "**/*.test.ts",
        "**/__tests__/**",
        "**/dist/**",
      ],
    },
  },
});
