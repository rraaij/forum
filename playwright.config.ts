import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
import { parseEnvFile } from "./packages/db/src/safe-target";

/*
 * E2E tests run against the forum_test stack only. Ports and URLs come from
 * .env.test so they are defined in exactly one place; the dev:test wrappers
 * apply the fail-closed loopback/database checks before anything starts.
 */
const values = parseEnvFile(
  readFileSync(resolve(import.meta.dirname, ".env.test"), "utf8"),
);
const appUrl = values.APP_URL ?? "http://localhost:3101";
const apiUrl = values.API_URL ?? "http://localhost:4100";

export default defineConfig({
  testDir: "e2e",
  // One worker while all tests share the single forum_test database.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: appUrl,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @forum/api dev:test",
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @forum/forum-app dev:test",
      url: appUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
