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
        // Unimplemented plugins — covered when getSuffix is implemented
        "src/plugin/SuffixNotationBase.ts",
        "src/plugin/LetterNotation.ts",
        "src/plugin/UnitNotation.ts",
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
