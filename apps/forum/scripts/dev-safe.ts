/*
 * Fail-closed frontend startup for the refactor workflow.
 *
 * Usage: bun scripts/dev-safe.ts <test|dev>
 *
 * Reads the repository-root .env.test or .env.dev itself and refuses to start
 * unless APP_URL and API_URL are loopback-only. Sets VITE_API_URL so SSR and
 * the browser both talk to the mode's API port instead of the normal one.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertLoopbackUrl,
  parseEnvFile,
  type SafeDbMode,
} from "@forum/db/safe-target";

function fail(message: string): never {
  console.error(`[dev-safe:forum] ${message}`);
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

let appUrl: URL;
let apiUrl: URL;
try {
  appUrl = assertLoopbackUrl("APP_URL", values.APP_URL);
  apiUrl = assertLoopbackUrl("API_URL", values.API_URL);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const appPort = appUrl.port || "80";

console.log(
  `[dev-safe:forum] starting frontend (${mode}) on port ${appPort} against API ${apiUrl.origin}`,
);

const child = Bun.spawn({
  cmd: ["pnpm", "exec", "vite", "dev", "--port", appPort, "--strictPort"],
  cwd: packageDir,
  env: {
    ...process.env,
    // Browser requests go through the Vite proxy (API_URL); SSR and any
    // absolute-URL fetches use VITE_API_URL. Both must agree.
    API_URL: apiUrl.origin,
    VITE_API_URL: apiUrl.origin,
    APP_URL: appUrl.origin,
  },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

process.exit(await child.exited);
