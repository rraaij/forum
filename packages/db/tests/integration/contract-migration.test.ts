/*
 * Phase 8 verification of the DESTRUCTIVE contract/reset migration
 * (0007_sturdy_ma_gnuci.sql), required by refactor plan section 8.
 *
 * The plan allows the migration to delete every forum row and forbids it
 * from touching authentication or profile data. Proving that needs the
 * migration applied in isolation: this test builds a scratch database up to
 * the expansion migration, fills it with legacy auth, profile and forum
 * content, snapshots the auth/profile rows, applies 0007 alone, and compares
 * every value afterwards.
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyLegacyBootstrap,
  connect,
  loadTestTarget,
  migrationsFolder,
  recreateDatabase,
} from "../helpers/test-db";

const CONTRACT_DB = "forum_contract_check_test";
const CONTRACT_MIGRATION = "0007_sturdy_ma_gnuci.sql";

const target = loadTestTarget();
let sql: postgres.Sql;

/** Applies one migration file the way drizzle's migrator does. */
async function applyMigrationFile(
  client: postgres.Sql,
  fileName: string,
): Promise<void> {
  const body = readFileSync(resolve(migrationsFolder, fileName), "utf8");
  for (const statement of body.split("--> statement-breakpoint")) {
    // A chunk holding only comments or whitespace is not a statement.
    if (!/[^\s]/.test(statement.replace(/\/\*[\s\S]*?\*\//g, ""))) continue;
    await client.unsafe(statement);
  }
}

function migrationFilesBefore(last: string): string[] {
  return readdirSync(migrationsFolder)
    .filter((name) => name.endsWith(".sql") && name < last)
    .sort();
}

/*
 * Auth and profile rows in the shape Better Auth and the profile module
 * write them, including every profile column added by migration 0005.
 */
const AUTH_USER = {
  id: "user-contract-check",
  name: "contract-check",
  email: "contract-check@example.test",
  displayName: "Contract Check",
  dateOfBirth: "1990-05-17",
  profileText: "Profile text with 'quotes' and a ümlaut.",
  image: "data:image/png;base64,iVBORw0KGgo=",
  location: "Netherlands",
  website: "https://example.com",
  photoUrls: ["https://example.com/a.png", "https://example.com/b.png"],
};

async function seedLegacyContent(client: postgres.Sql): Promise<void> {
  await client`
    INSERT INTO users (id, name, email, email_verified, display_name,
                       date_of_birth, profile_text, image, location, website,
                       photo_urls)
    VALUES (${AUTH_USER.id}, ${AUTH_USER.name}, ${AUTH_USER.email}, true,
            ${AUTH_USER.displayName}, ${AUTH_USER.dateOfBirth},
            ${AUTH_USER.profileText}, ${AUTH_USER.image}, ${AUTH_USER.location},
            ${AUTH_USER.website}, ${AUTH_USER.photoUrls})
  `;
  await client`
    INSERT INTO sessions (id, expires_at, token, user_id)
    VALUES ('session-contract-check', now() + interval '1 day',
            'token-contract-check', ${AUTH_USER.id})
  `;
  await client`
    INSERT INTO accounts (id, account_id, provider_id, user_id, password)
    VALUES ('account-contract-check', ${AUTH_USER.id}, 'credential',
            ${AUTH_USER.id}, 'hashed-password-value')
  `;

  // Legacy hierarchy and content: exactly what the migration must destroy.
  const [category] = await client`
    INSERT INTO categories (name, slug, abbreviation)
    VALUES ('Legacy Category', 'legacy-category', 'LEG')
    RETURNING id
  `;
  const [subcategory] = await client`
    INSERT INTO subcategories (category_id, name, slug, abbreviation)
    VALUES (${category.id}, 'Legacy Sub', 'legacy-sub', 'LSUB')
    RETURNING id
  `;
  const [topic] = await client`
    INSERT INTO topics (category_id, subcategory_id, author_id, title, slug,
                        post_count, last_post_at)
    VALUES (${category.id}, ${subcategory.id}, ${AUTH_USER.id},
            'Legacy topic', 'legacy-topic', 2, now())
    RETURNING id
  `;
  // Legacy posts have no kind and no deleted_at — the reason for the reset.
  const [post] = await client`
    INSERT INTO posts (topic_id, author_id, content)
    VALUES (${topic.id}, ${AUTH_USER.id}, 'Legacy opening body')
    RETURNING id
  `;
  await client`
    INSERT INTO posts (topic_id, author_id, content, is_deleted)
    VALUES (${topic.id}, ${AUTH_USER.id}, 'Legacy deleted reply', true)
  `;
  await client`
    INSERT INTO reactions (post_id, user_id, emoji)
    VALUES (${post.id}, ${AUTH_USER.id}, '👍')
  `;
  await client`
    INSERT INTO votes (post_id, user_id, value)
    VALUES (${post.id}, ${AUTH_USER.id}, 1)
  `;
  // An expand-phase board row, which the reset also clears.
  await client`
    INSERT INTO boards (name, slug, abbreviation)
    VALUES ('Expand Board', 'expand-board', 'EXP')
  `;
}

async function authSnapshot(client: postgres.Sql) {
  const users = await client`SELECT * FROM users ORDER BY id`;
  const sessions = await client`SELECT * FROM sessions ORDER BY id`;
  const accounts = await client`SELECT * FROM accounts ORDER BY id`;
  return {
    users: users.map((row) => ({ ...row })),
    sessions: sessions.map((row) => ({ ...row })),
    accounts: accounts.map((row) => ({ ...row })),
  };
}

let before: Awaited<ReturnType<typeof authSnapshot>>;

beforeAll(async () => {
  await recreateDatabase(target, CONTRACT_DB);
  sql = connect(target, CONTRACT_DB);

  await applyLegacyBootstrap(sql);
  for (const file of migrationFilesBefore(CONTRACT_MIGRATION)) {
    await applyMigrationFile(sql, file);
  }
  await seedLegacyContent(sql);
  before = await authSnapshot(sql);
}, 60_000);

afterAll(async () => {
  await sql?.end();
});

describe("contract/reset migration", () => {
  it("starts from populated legacy content", async () => {
    // Guards the test itself: proving deletion is meaningless if the
    // fixture never inserted anything.
    const [counts] = await sql`
      SELECT (SELECT count(*) FROM topics) AS topics,
             (SELECT count(*) FROM posts) AS posts,
             (SELECT count(*) FROM categories) AS categories,
             (SELECT count(*) FROM boards) AS boards
    `;
    expect(Number(counts.topics)).toBe(1);
    expect(Number(counts.posts)).toBe(2);
    expect(Number(counts.categories)).toBe(1);
    expect(Number(counts.boards)).toBe(1);
    expect(before.users).toHaveLength(1);
    expect(before.sessions).toHaveLength(1);
    expect(before.accounts).toHaveLength(1);
  });

  it("applies and leaves authentication and profile data byte-for-byte unchanged", async () => {
    await applyMigrationFile(sql, CONTRACT_MIGRATION);

    const after = await authSnapshot(sql);
    // Whole-row equality: every profile column, not a chosen subset.
    expect(after).toEqual(before);
    expect(after.users[0].profile_text).toBe(AUTH_USER.profileText);
    expect(after.users[0].photo_urls).toEqual(AUTH_USER.photoUrls);
    expect(after.accounts[0].password).toBe("hashed-password-value");
  });

  it("deleted every forum row", async () => {
    const [counts] = await sql`
      SELECT (SELECT count(*) FROM topics) AS topics,
             (SELECT count(*) FROM posts) AS posts,
             (SELECT count(*) FROM votes) AS votes,
             (SELECT count(*) FROM reactions) AS reactions,
             (SELECT count(*) FROM topic_views) AS topic_views,
             (SELECT count(*) FROM boards) AS boards
    `;
    for (const [name, value] of Object.entries(counts)) {
      expect(Number(value), `${name} should be empty`).toBe(0);
    }
  });

  it("removed the legacy tables, columns, indexes, and trigger function", async () => {
    const tables = (
      await sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
    ).map((row) => row.table_name as string);
    // This test applies migration files directly, so drizzle's bookkeeping
    // table is absent; the target forum schema is what matters here.
    expect(tables).toEqual([
      "accounts",
      "boards",
      "posts",
      "reactions",
      "sessions",
      "topic_views",
      "topics",
      "users",
      "votes",
    ]);

    const topicColumns = (
      await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'topics'
      `
    ).map((row) => row.column_name as string);
    expect(topicColumns).not.toContain("category_id");
    expect(topicColumns).not.toContain("subcategory_id");
    expect(topicColumns).not.toContain("post_count");
    expect(topicColumns).not.toContain("last_post_at");

    const functions = (
      await sql`
        SELECT proname FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
      `
    ).map((row) => row.proname as string);
    expect(functions).not.toContain(
      "enforce_forum_identifier_cross_table_uniqueness",
    );
    // The board cycle trigger is part of the target schema and stays.
    expect(functions).toContain("enforce_board_hierarchy_acyclic");
  });

  it("made the redesigned columns required", async () => {
    const nullability = await sql`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('topics', 'board_id'), ('topics', 'reply_count'),
          ('topics', 'last_activity_at'), ('posts', 'kind')
        )
      ORDER BY table_name, column_name
    `;
    expect(
      nullability.map((row) => [
        `${row.table_name}.${row.column_name}`,
        row.is_nullable,
      ]),
    ).toEqual([
      ["posts.kind", "NO"],
      ["topics.board_id", "NO"],
      ["topics.last_activity_at", "NO"],
      ["topics.reply_count", "NO"],
    ]);
  });

  it("enforces the final topic slug and post deletion constraints", async () => {
    const [board] = await sql`
      INSERT INTO boards (name, slug, abbreviation)
      VALUES ('After Reset', 'after-reset', 'AFT') RETURNING id
    `;
    const [topic] = await sql`
      INSERT INTO topics (board_id, author_id, title, slug, reply_count,
                          last_activity_at)
      VALUES (${board.id}, ${AUTH_USER.id}, 'First', 'shared-slug', 0, now())
      RETURNING id
    `;

    // Global, case-insensitive slug uniqueness across every board.
    const [otherBoard] = await sql`
      INSERT INTO boards (name, slug, abbreviation)
      VALUES ('Elsewhere', 'elsewhere', 'ELS') RETURNING id
    `;
    await expect(
      sql`
        INSERT INTO topics (board_id, author_id, title, slug, reply_count,
                            last_activity_at)
        VALUES (${otherBoard.id}, ${AUTH_USER.id}, 'Second', 'SHARED-SLUG', 0,
                now())
      `,
    ).rejects.toThrow(/topics_slug_unique_idx/);

    // Deletion state may never disagree across the two columns.
    await expect(
      sql`
        INSERT INTO posts (topic_id, author_id, content, kind, is_deleted)
        VALUES (${topic.id}, ${AUTH_USER.id}, 'x', 'reply', true)
      `,
    ).rejects.toThrow(/posts_deleted_at_consistency_check/);

    await expect(
      sql`
        INSERT INTO posts (topic_id, author_id, content, kind, deleted_at)
        VALUES (${topic.id}, ${AUTH_USER.id}, 'x', 'reply', now())
      `,
    ).rejects.toThrow(/posts_deleted_at_consistency_check/);

    // A post without a kind can no longer be written at all.
    await expect(
      sql`
        INSERT INTO posts (topic_id, author_id, content)
        VALUES (${topic.id}, ${AUTH_USER.id}, 'no kind')
      `,
    ).rejects.toThrow(/kind/);
  });
});
