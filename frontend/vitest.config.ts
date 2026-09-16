import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Specs only. `lib/**\/*.test.ts` belongs to `node --test` (see BIPI-SITE-NOTES.md) and
 * `e2e/` to Playwright; the `.spec` suffix is what keeps the three runners apart.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.spec.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
