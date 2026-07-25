import postgres from "postgres";
import { loadTestEnv } from "./helpers/test-env";

const target = loadTestEnv();

// Fail fast with a useful message when forum_test has not been migrated yet.
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
    SELECT count(*)::int AS count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  `;
  if (count === 0) {
    throw new Error(
      "forum_test has no schema. Run: docker compose -f docker-compose.test.yml up -d --wait && pnpm --filter @forum/db db:migrate:test",
    );
  }
} finally {
  await sql.end();
}
