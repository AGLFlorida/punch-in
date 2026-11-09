import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import next from "@next/eslint-plugin-next";

export default defineConfig([
  { 
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"], 
    plugins: { js }, 
    extends: ["js/recommended"], 
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  // Registered without `files` so Next's build-time detection (which resolves
  // the config for eslint.config.mts itself) sees the plugin.
  { plugins: { "@next/next": next } },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      ...next.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off"
    }
  },
  {
    ignores: [
      "dist/**",
      "**/.next/**",
      "**/*.d.ts",
      "out/**"
    ]
  }
]);
