import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "output/playwright/**",
    ".playwright-cli/**",
    // Vendored Pyodide runtime, copied in by scripts/copy-pyodide-assets.mjs.
    "public/pyodide/**",
    // Dated copies the content manager leaves behind; not part of the build.
    "**/*.backup-*.ts",
    "**/*.ts.backup.*",
    // A superseded page kept beside the live one. Next.js only routes page.tsx,
    // so this never ships.
    "**/page_old_backup.tsx",
    "**/page_old.tsx",
    // Local-only authoring tools. These paths are in .gitignore on purpose, so
    // nothing here is ever committed and lint findings could not be shared.
    "src/app/dev/**",
    "src/app/api/dev/**",
    "src/app/admin/cms/**",
    "src/app/api/admin/game-content/**",
  ]),
  {
    // Game content is authored from the templates in src/content/_template and
    // by the local content manager. Every file opens with @ts-nocheck on
    // purpose: these are Phaser sketches, not typed application code, and the
    // Phaser scene idiom relies on aliasing `this`. Typing them would not make
    // a game more correct, so the rules that only describe type discipline are
    // scoped off here rather than silenced file by file. Everything that can
    // actually break a game still applies.
    files: ["src/content/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-this-alias": "off",
      // The templates ship helpers such as loadSceneContent that an author is
      // meant to call from their own scene code. Unused in the template is the
      // normal state, not a leftover.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
