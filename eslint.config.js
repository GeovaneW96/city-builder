import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    ignores: ["dist/", "node_modules/", "*.config.*"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-empty-function": "off",

      complexity: ["error", 10],
      "max-depth": ["error", 4],
      "max-lines-per-function": ["warn", 60],
      "max-params": ["error", 5],
      "max-nested-callbacks": ["error", 3],
    },
  },
  {
    files: ["src/simulation/**"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["three", "@types/three", "three/*"],
              message: "Simulation code must not import Three.js",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/data/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../simulation", "../rendering", "../ui"],
              message: "Data files must not import simulation, rendering, or UI code",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../simulation", "../rendering", "../ui"],
              message: "Shared code must not import simulation, rendering, or UI code",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["scripts/**"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
