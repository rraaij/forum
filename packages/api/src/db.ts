import * as schema from "@forum/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Keep the connection pieces available separately so error responses can say
// which configured database target failed without exposing the password.
const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT || "5432",
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const connectionString = `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

let dbInstance: ReturnType<typeof createDb> | null = null;

function createDb() {
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
  return `${dbConfig.username}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
}

export function getDbUnavailableMessage() {
  // This message is intentionally explicit because a stopped NAS/Postgres
  // service otherwise bubbles up as a generic route "Internal Server Error".
  return `Database unavailable at ${getDbTarget()}. Check that PostgreSQL is running, that ${dbConfig.host}:${dbConfig.port} is reachable from this machine, and that the POSTGRES_* values in .env match .env.example.`;
}

export type Database = ReturnType<typeof getDb>;
