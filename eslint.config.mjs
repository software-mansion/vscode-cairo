import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";
import pluginChaiFriendly from "eslint-plugin-chai-friendly";

export default ts.config(
  {
    ignores: [
      "dist/*",
      "out/*",
      ".test-extensions",
      "eslint.config.mjs",
      "bin/gen-cairo-snippets.mjs",
    ],
  },
  js.configs.recommended,
  ts.configs.recommendedTypeChecked,
  {
    rules: {
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  ts.configs.stylistic,
  prettier,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  pluginChaiFriendly.configs.recommendedFlat,
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
);
