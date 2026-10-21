import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["@anytools/source"] },
  ssr: { resolve: { conditions: ["@anytools/source"] } },
  test: { include: ["src/**/*.test.ts"] },
});
