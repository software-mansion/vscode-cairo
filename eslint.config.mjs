import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default ts.config(
  {
    ignores: ["dist/*", "out/*"],
  },
  js.configs.recommended,
  ts.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
);
