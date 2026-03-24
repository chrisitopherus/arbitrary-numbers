import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/tests/**",
        "src/index.ts",
        "src/types/**",       // interface-only files, no runnable JS
        "src/constants/**",   // pure data, no logic to cover
        "src/dev.ts"
      ],
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
