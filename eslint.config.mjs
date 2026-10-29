import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // External editor/model resources intentionally reset UI state in effects.
  // Keep these performance notices visible without treating them as runtime failures.
  { files: ["src/**/*.tsx"], rules: { "react-hooks/set-state-in-effect": "warn" } },
  { files: ["scripts/**/*.cjs", "scripts/smoke-test.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".tools/**", "tmp/**", "public/vendor/**",
  ]),
]);

export default eslintConfig;
