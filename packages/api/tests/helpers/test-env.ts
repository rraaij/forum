/*
 * Loads .env.test into process.env for API integration tests, applying the
 * same fail-closed checks as the CLI wrappers. Must run before any module
 * that reads POSTGRES_* at import time (src/db.ts does), which is why the
 * integration Vitest config lists tests/setup-integration.ts as a setup file.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSafeDbTarget,
  assertTargetsDiffer,
  type DbTarget,
  dbTargetFromEnv,
  parseEnvFile,
} from "@forum/db/safe-target";

export const repoRoot = resolve(import.meta.dirname, "../../../..");

export function loadTestEnv(): DbTarget {
  const envPath = resolve(repoRoot, ".env.test");
  if (!existsSync(envPath)) {
    throw new Error(
      `Missing ${envPath}. Copy .env.test.example to .env.test first.`,
    );
  }
  const values = parseEnvFile(readFileSync(envPath, "utf8"));
  const target = dbTargetFromEnv(values);
  assertSafeDbTarget(target, "test");

  const rootEnvPath = resolve(repoRoot, ".env");
  if (existsSync(rootEnvPath)) {
    let rootTarget: DbTarget | null = null;
    try {
      rootTarget = dbTargetFromEnv(
        parseEnvFile(readFileSync(rootEnvPath, "utf8")),
      );
    } catch {
      // An incomplete root .env cannot collide with the test target.
    }
    if (rootTarget) assertTargetsDiffer(target, rootTarget);
  }

  process.env.POSTGRES_HOST = target.host;
  process.env.POSTGRES_PORT = String(target.port);
  process.env.POSTGRES_DB = target.database;
  process.env.POSTGRES_USER = target.user;
  process.env.POSTGRES_PASSWORD = target.password;
  process.env.AUTH_SECRET = values.AUTH_SECRET;
  process.env.APP_URL = values.APP_URL;
  process.env.API_URL = values.API_URL;
  process.env.API_PORT = values.API_PORT;

  return target;
}
