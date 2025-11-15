import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
