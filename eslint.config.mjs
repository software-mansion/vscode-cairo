import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";
import pluginChaiFriendly from "eslint-plugin-chai-friendly";

export default ts.config(
  {
    ignores: ["dist/*", "out/*", ".test-extensions"],
  },
  js.configs.recommended,
  ts.configs.recommended,
  ts.configs.stylistic,
  prettier,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginChaiFriendly.configs.recommendedFlat,
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
);
