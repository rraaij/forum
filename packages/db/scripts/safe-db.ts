/*
 * Safe wrapper for database commands during the refactor.
 *
 * Usage: bun scripts/safe-db.ts <test|dev> <generate|migrate|seed|studio>
 *
 * Reads the repository-root .env.test or .env.dev itself (inherited
 * POSTGRES_* values are ignored on purpose), applies the fail-closed target
 * checks from src/safe-target.ts, and only then spawns the real command with
 * the validated values. The normal root .env is never used by this wrapper.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSafeDbTarget,
  assertTargetsDiffer,
  type DbTarget,
  dbTargetFromEnv,
  describeDbTarget,
  parseEnvFile,
  type SafeDbMode,
} from "../src/safe-target";

const MODES: SafeDbMode[] = ["test", "dev"];
const ACTIONS = ["generate", "migrate", "seed", "studio"] as const;
type Action = (typeof ACTIONS)[number];

function fail(message: string): never {
  console.error(`[safe-db] ${message}`);
  process.exit(1);
}

const [modeArg, actionArg] = process.argv.slice(2);
if (!MODES.includes(modeArg as SafeDbMode)) {
  fail(`First argument must be one of: ${MODES.join(", ")}.`);
}
if (!ACTIONS.includes(actionArg as Action)) {
  fail(`Second argument must be one of: ${ACTIONS.join(", ")}.`);
}
const mode = modeArg as SafeDbMode;
const action = actionArg as Action;

const packageDir = resolve(import.meta.dir, "..");
const repoRoot = resolve(packageDir, "../..");
const envPath = resolve(repoRoot, `.env.${mode}`);

if (!existsSync(envPath)) {
  fail(
    `Missing ${envPath}. Copy .env.${mode}.example to .env.${mode} first; never copy values from the normal .env.`,
  );
}

const fileValues = parseEnvFile(readFileSync(envPath, "utf8"));
let target: DbTarget;
try {
  target = dbTargetFromEnv(fileValues);
  assertSafeDbTarget(target, mode);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (mode === "test") {
  // The test database must additionally differ from whatever the normal .env
  // points at, even when that target happens to look loopback-safe.
  const rootEnvPath = resolve(repoRoot, ".env");
  if (existsSync(rootEnvPath)) {
    const rootValues = parseEnvFile(readFileSync(rootEnvPath, "utf8"));
    let rootTarget: DbTarget | null = null;
    try {
      rootTarget = dbTargetFromEnv(rootValues);
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
};

const commands: Record<Action, string[]> = {
  generate: ["pnpm", "exec", "drizzle-kit", "generate"],
  migrate: ["pnpm", "exec", "drizzle-kit", "migrate"],
  seed: ["bun", "--bun", "scripts/seed.ts"],
  studio: ["pnpm", "exec", "drizzle-kit", "studio"],
};

console.log(
  `[safe-db] ${action} (${mode}) against ${describeDbTarget(target)} from .env.${mode}`,
);

if (action === "migrate") {
  // The committed migration history starts from a schema-pushed database, so
  // a completely EMPTY, safety-checked _test/_dev database first receives
  // the legacy bootstrap (exact pre-0000 schema). Non-empty databases are
  // left alone; the loopback/suffix guard above already excludes QNAP.
  const { default: postgres } = await import("postgres");
  const sql = postgres({
    host: target.host,
    port: target.port,
    database: target.database,
    username: target.user,
    password: target.password,
    max: 1,
    onnotice: () => {},
  });
  try {
    const [{ count }] = await sql`
      SELECT count(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    if (count === 0) {
      console.log(
        `[safe-db] empty ${mode} database; applying legacy bootstrap (pre-0000 schema)`,
      );
      const bootstrapPath = resolve(packageDir, "sql/legacy-bootstrap.sql");
      await sql.unsafe(readFileSync(bootstrapPath, "utf8"));
    }
  } finally {
    await sql.end();
  }
}

const result = Bun.spawnSync({
  cmd: commands[action],
  cwd: packageDir,
  env: childEnv,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(result.exitCode ?? 1);
