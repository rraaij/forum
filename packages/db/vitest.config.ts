import { defineConfig } from "vitest/config";

// Unit tests only: pure functions, no database. Integration tests live in
// vitest.integration.config.ts and require the forum_test database.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
