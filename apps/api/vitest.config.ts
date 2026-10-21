import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["@anytools/source"] },
  ssr: { resolve: { conditions: ["@anytools/source"] } },
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    // Test files share one Postgres database and Redis DB; run them one at a time.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
