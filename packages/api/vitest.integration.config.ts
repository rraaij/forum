import { defineConfig } from "vitest/config";

// Integration tests share one forum_test database: file parallelism must stay
// disabled so migrations/truncation never run from two workers at once.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Loads .env.test (fail-closed) before any module reads POSTGRES_*.
    setupFiles: ["tests/setup-integration.ts"],
  },
});
