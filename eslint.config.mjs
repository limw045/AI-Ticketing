import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Existing UI pages are being incrementally typed; database boundaries are checked explicitly.
      "@typescript-eslint/no-explicit-any": "off",
      // Initial data hydration is intentional in these client-only Supabase pages.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "dist/**",
    "next-env.d.ts",
  ]),
]);
