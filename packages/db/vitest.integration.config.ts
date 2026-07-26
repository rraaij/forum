import { defineConfig } from "vitest/config";

// Migration smoke tests rebuild the forum_test database from scratch; they
// must never run in parallel with anything that touches the same database.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Temporary until the Phase 0 migration smoke test lands.
    passWithNoTests: true,
  },
});
