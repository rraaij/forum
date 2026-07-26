/*
 * Fail-closed database target guard for the refactor workflow.
 *
 * Every test/dev database command (migrations, seeds, API startup wrappers,
 * test bootstrap) must pass through these checks. The rules are deliberate:
 *
 * - The host must be loopback. The QNAP database can never match.
 * - The database name must end in the exact suffix for the mode, so test
 *   commands cannot touch forum_dev and vice versa.
 * - There is intentionally NO environment-variable override for these checks.
 *
 * The functions are pure: they never read process.env themselves, so callers
 * always decide (and log) exactly which env file produced the target.
 */

export type SafeDbMode = "test" | "dev";

export interface DbTarget {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) values[key] = value;
  }
  return values;
}

export function dbTargetFromEnv(
  values: Record<string, string | undefined>,
): DbTarget {
  const host = values.POSTGRES_HOST;
  const port = Number(values.POSTGRES_PORT);
  const database = values.POSTGRES_DB;
  const user = values.POSTGRES_USER;
  const password = values.POSTGRES_PASSWORD;

  if (
    !host ||
    !database ||
    !user ||
    !password ||
    !Number.isInteger(port) ||
    port <= 0
  ) {
    throw new Error(
      "Database target is incomplete: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD are all required.",
    );
  }

  return { host, port, database, user, password };
}

export function describeDbTarget(target: DbTarget): string {
  // Never include the password here; this string ends up in logs and errors.
  return `${target.user}@${target.host}:${target.port}/${target.database}`;
}

export function assertSafeDbTarget(target: DbTarget, mode: SafeDbMode): void {
  if (!LOOPBACK_HOSTS.has(target.host)) {
    throw new Error(
      `Refusing to touch ${describeDbTarget(target)}: the ${mode} workflow only accepts localhost or 127.0.0.1 as POSTGRES_HOST. There is no override.`,
    );
  }

  const requiredSuffix = `_${mode}`;
  if (!target.database.endsWith(requiredSuffix)) {
    throw new Error(
      `Refusing to touch ${describeDbTarget(target)}: the ${mode} workflow only accepts a database name ending in ${requiredSuffix}. There is no override.`,
    );
  }
}

export function assertLoopbackUrl(
  name: string,
  value: string | undefined,
): URL {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error(
      `${name} must be a valid URL; got ${JSON.stringify(value)}.`,
    );
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      `${name} must point at localhost or 127.0.0.1 in this workflow; got ${url.origin}. There is no override.`,
    );
  }
  return url;
}

export function assertTargetsDiffer(target: DbTarget, other: DbTarget): void {
  const comparableHost = (host: string) =>
    LOOPBACK_HOSTS.has(host) ? "loopback" : host;
  if (
    comparableHost(target.host) === comparableHost(other.host) &&
    target.port === other.port &&
    target.database === other.database
  ) {
    throw new Error(
      `Refusing to touch ${describeDbTarget(target)}: it is the same host, port, and database as the normal .env target. The test database must be a separate database.`,
    );
  }
}
