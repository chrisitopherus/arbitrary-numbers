import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/**", "node_modules/**", "benchmarks/**"],
    },
    {
        files: ["src/**/*.ts", "tests/**/*.ts"],
        extends: [...tseslint.configs.recommended],
        rules: {
            "indent":                    ["error", 4, { SwitchCase: 1 }],
            "quotes":                    ["error", "double"],
            "semi":                      ["error", "always"],
            "comma-dangle":              ["error", "always-multiline"],
            "eol-last":                  ["error", "always"],
            "no-multiple-empty-lines":   ["error", { max: 1, maxBOF: 0, maxEOF: 1 }],

            "padding-line-between-statements": [
                "error",
                { blankLine: "always", prev: "if",      next: "*"      },
                { blankLine: "any",    prev: "if",      next: "if"     },
                { blankLine: "always", prev: ["for", "while", "do"], next: "*" },
            ],

            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                { accessibility: "explicit" },
            ],
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { prefer: "type-imports", fixStyle: "inline-type-imports" },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/no-non-null-assertion": "off",
        },
    },
);
