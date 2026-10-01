import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ["src/**/*.ts"],
  languageOptions: { globals: { document: "readonly", Error: "readonly" } },
});
