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
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: { "@next/next": next as any },
    rules: {
       ...(next as any).configs["core-web-vitals"].rules, 
      "@next/next/no-html-link-for-pages": "off"
    }
  },
  {
    ignores: [
      "dist/**",
      "**/.next/**",
      "**/*.d.ts",
      "eslint.config.mts"
    ]
  }
]);
