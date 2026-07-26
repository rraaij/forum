import * as schema from "@forum/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "./env";

// Keep the connection pieces available separately so error responses can say
// which configured database target failed without exposing the password.
// Resolved lazily so the startup env schema runs (and fails fast) first.
function getDbConfig() {
  const env = getEnv();
  return {
    host: env.POSTGRES_HOST,
    port: String(env.POSTGRES_PORT),
    database: env.POSTGRES_DB,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
  };
}

let dbInstance: ReturnType<typeof createDb> | null = null;

function createDb() {
  const dbConfig = getDbConfig();
  const connectionString = `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });

  return drizzle(client, { schema });
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export function getDbTarget() {
  // Keep logs and HTTP errors useful without ever exposing the database password.
  const dbConfig = getDbConfig();
  return `${dbConfig.username}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
}

export function getDbUnavailableMessage() {
  // This message is intentionally explicit because a stopped NAS/Postgres
  // service otherwise bubbles up as a generic route "Internal Server Error".
  const dbConfig = getDbConfig();
  return `Database unavailable at ${getDbTarget()}. Check that PostgreSQL is running, that ${dbConfig.host}:${dbConfig.port} is reachable from this machine, and that the POSTGRES_* values in .env match .env.example.`;
}

export type Database = ReturnType<typeof getDb>;
