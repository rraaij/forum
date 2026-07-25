/*
 * Test database helpers. Every connection made from tests goes through the
 * same fail-closed target checks as the CLI wrappers: loopback host, _test
 * database suffix, and a target that differs from the normal .env.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  assertSafeDbTarget,
  assertTargetsDiffer,
  type DbTarget,
  dbTargetFromEnv,
  parseEnvFile,
} from "../../src/safe-target";

const packageDir = resolve(import.meta.dirname, "../..");
export const repoRoot = resolve(packageDir, "../..");
export const migrationsFolder = resolve(packageDir, "migrations");
export const legacyBootstrapPath = resolve(
  packageDir,
  "sql/legacy-bootstrap.sql",
);

export function loadTestTarget(): DbTarget {
  const envPath = resolve(repoRoot, ".env.test");
  if (!existsSync(envPath)) {
    throw new Error(
      `Missing ${envPath}. Copy .env.test.example to .env.test first.`,
    );
  }
  const target = dbTargetFromEnv(parseEnvFile(readFileSync(envPath, "utf8")));
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

  return target;
}

export function connect(target: DbTarget, database = target.database) {
  // Scratch databases created by tests must stay inside the safety envelope.
  assertSafeDbTarget({ ...target, database }, "test");
  return postgres({
    host: target.host,
    port: target.port,
    database,
    username: target.user,
    password: target.password,
    max: 1,
    onnotice: () => {},
  });
}

export async function recreateDatabase(
  target: DbTarget,
  database: string,
): Promise<void> {
  assertSafeDbTarget({ ...target, database }, "test");
  const admin = connect(target);
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${database}"`);
    await admin.unsafe(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }
}

export async function applyLegacyBootstrap(sql: postgres.Sql): Promise<void> {
  await sql.unsafe(readFileSync(legacyBootstrapPath, "utf8"));
}
