import { dbTargetFromEnv } from "@forum/db/safe-target";
import * as schema from "@forum/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/*
 * Direct SQL access for fixtures and assertions. process.env is already
 * validated and populated by tests/setup-integration.ts.
 */

let client: postgres.Sql | null = null;

export function testSql(): postgres.Sql {
  if (!client) {
    const target = dbTargetFromEnv(process.env);
    client = postgres({
      host: target.host,
      port: target.port,
      database: target.database,
      username: target.user,
      password: target.password,
      max: 1,
      onnotice: () => {},
    });
  }
  return client;
}

let drizzleClient: postgres.Sql | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/*
 * Drizzle handle for module-level tests. max: 5 so concurrency tests can
 * hold several transactions open at once.
 */
export function testDrizzle() {
  if (!drizzleDb) {
    const target = dbTargetFromEnv(process.env);
    drizzleClient = postgres({
      host: target.host,
      port: target.port,
      database: target.database,
      username: target.user,
      password: target.password,
      max: 5,
      onnotice: () => {},
    });
    drizzleDb = drizzle(drizzleClient, { schema });
  }
  return drizzleDb;
}

export async function closeTestSql(): Promise<void> {
  await client?.end();
  client = null;
  await drizzleClient?.end();
  drizzleClient = null;
  drizzleDb = null;
}

// Order-independent reset between tests; auth tables included because tests
// create their own users through the real sign-up endpoint.
export async function truncateAll(): Promise<void> {
  await testSql().unsafe(
    `TRUNCATE TABLE votes, reactions, topic_views, posts, topics, boards,
     subcategories, categories, sessions, accounts, users
     RESTART IDENTITY CASCADE`,
  );
}
