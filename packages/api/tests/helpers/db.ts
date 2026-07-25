import { dbTargetFromEnv } from "@forum/db/safe-target";
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

export async function closeTestSql(): Promise<void> {
  await client?.end();
  client = null;
}

// Order-independent reset between tests; auth tables included because tests
// create their own users through the real sign-up endpoint.
export async function truncateAll(): Promise<void> {
  await testSql().unsafe(
    `TRUNCATE TABLE votes, reactions, posts, topics, subcategories, categories,
     sessions, accounts, users RESTART IDENTITY CASCADE`,
  );
}
