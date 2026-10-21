import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["@anytools/source"],
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  ssr: { resolve: { conditions: ["@anytools/source"] } },
  test: { include: ["src/**/*.test.ts"] },
});
