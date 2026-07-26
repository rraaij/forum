/*
 * Fail-closed API startup for the refactor workflow.
 *
 * Usage: bun scripts/dev-safe.ts <test|dev>
 *
 * Reads the repository-root .env.test or .env.dev itself, applies the same
 * loopback/database-suffix checks as the migration wrappers, verifies the
 * app/api URLs are loopback-only, and only then starts the API with the
 * validated values. The normal root .env is never used here.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertLoopbackUrl,
  assertSafeDbTarget,
  assertTargetsDiffer,
  type DbTarget,
  dbTargetFromEnv,
  describeDbTarget,
  parseEnvFile,
  type SafeDbMode,
} from "@forum/db/safe-target";

function fail(message: string): never {
  console.error(`[dev-safe:api] ${message}`);
  process.exit(1);
}

const modeArg = process.argv[2];
if (modeArg !== "test" && modeArg !== "dev") {
  fail("First argument must be test or dev.");
}
const mode: SafeDbMode = modeArg;

const packageDir = resolve(import.meta.dir, "..");
const repoRoot = resolve(packageDir, "../..");
const envPath = resolve(repoRoot, `.env.${mode}`);

if (!existsSync(envPath)) {
  fail(`Missing ${envPath}. Copy .env.${mode}.example to .env.${mode} first.`);
}

const values = parseEnvFile(readFileSync(envPath, "utf8"));

let target: DbTarget;
try {
  target = dbTargetFromEnv(values);
  assertSafeDbTarget(target, mode);
  assertLoopbackUrl("APP_URL", values.APP_URL);
  const apiUrl = assertLoopbackUrl("API_URL", values.API_URL);
  if (String(Number(values.API_PORT)) !== values.API_PORT) {
    fail(`API_PORT must be a number; got ${JSON.stringify(values.API_PORT)}.`);
  }
  if (apiUrl.port !== values.API_PORT) {
    fail(
      `API_URL (${apiUrl.origin}) and API_PORT (${values.API_PORT}) disagree.`,
    );
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (mode === "test") {
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
    if (rootTarget) {
      try {
        assertTargetsDiffer(target, rootTarget);
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    }
  }
}

const childEnv: Record<string, string | undefined> = {
  ...process.env,
  POSTGRES_HOST: target.host,
  POSTGRES_PORT: String(target.port),
  POSTGRES_DB: target.database,
  POSTGRES_USER: target.user,
  POSTGRES_PASSWORD: target.password,
  AUTH_SECRET: values.AUTH_SECRET,
  APP_URL: values.APP_URL,
  API_URL: values.API_URL,
  API_PORT: values.API_PORT,
};

console.log(
  `[dev-safe:api] starting API (${mode}) on port ${values.API_PORT} against ${describeDbTarget(target)}`,
);

// --hot only for interactive development; Playwright-managed test servers
// should be plain processes.
const cmd =
  mode === "dev"
    ? ["bun", "--bun", "--hot", "src/index.ts"]
    : ["bun", "--bun", "src/index.ts"];

const child = Bun.spawn({
  cmd,
  cwd: packageDir,
  env: childEnv,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

process.exit(await child.exited);
