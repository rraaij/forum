/*
 * Migration smoke test required by Phase 0 of docs/REFACTOR_PLAN.md:
 * prove empty database -> legacy bootstrap -> complete history -> target
 * schema. "Target schema" is verified structurally: a second scratch
 * database built with drizzle-kit push (today's schema.ts) must have the
 * same public tables, columns, indexes, and constraints as the migrated one
 * (triggers/functions excluded: 0003/0004 are custom SQL by design).
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyLegacyBootstrap,
  connect,
  loadTestTarget,
  migrationsFolder,
  recreateDatabase,
} from "../helpers/test-db";

const HISTORY_DB = "forum_history_check_test";
const PUSH_DB = "forum_push_check_test";

const target = loadTestTarget();
let historySql: postgres.Sql;

async function tableNames(sql: postgres.Sql): Promise<string[]> {
  const rows = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name as string);
}

async function structure(sql: postgres.Sql) {
  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default,
           character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, column_name
  `;
  const indexes = await sql`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY indexname
  `;
  const constraints = await sql`
    SELECT conname, contype, conrelid::regclass::text AS table_name,
           pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY conname
  `;
  return {
    columns: columns.map((c) => ({ ...c })),
    indexes: indexes.map((i) => ({ ...i })),
    constraints: constraints.map((c) => ({ ...c })),
  };
}

beforeAll(async () => {
  await recreateDatabase(target, HISTORY_DB);
  historySql = connect(target, HISTORY_DB);
});

afterAll(async () => {
  await historySql?.end();
});

describe("legacy bootstrap and migration history", () => {
  it("applies the legacy bootstrap to an empty database, idempotently", async () => {
    await applyLegacyBootstrap(historySql);
    await applyLegacyBootstrap(historySql);

    const tables = await tableNames(historySql);
    expect(tables).toEqual([
      "accounts",
      "categories",
      "posts",
      "reactions",
      "sessions",
      "subcategories",
      "topics",
      "users",
      "votes",
    ]);

    // Pre-0000 state: no abbreviation column anywhere yet.
    const abbrev = await historySql`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'abbreviation'
    `;
    expect(abbrev).toHaveLength(0);
  });

  it("runs the complete committed migration history on top", async () => {
    const db = drizzle(historySql);
    await migrate(db, { migrationsFolder });

    // 0000/0001: abbreviation columns exist and are NOT NULL.
    const abbrev = await historySql`
      SELECT table_name, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'abbreviation'
      ORDER BY table_name
    `;
    // boards (added in 0006) also carries an abbreviation column.
    expect(abbrev.map((r) => [r.table_name, r.is_nullable])).toEqual([
      ["boards", "NO"],
      ["categories", "NO"],
      ["subcategories", "NO"],
    ]);

    // 0002: named constraint/index dropped, lower() unique indexes added.
    const dropped = await historySql`
      SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_unique'
    `;
    expect(dropped).toHaveLength(0);
    const indexNames = (
      await historySql`
        SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
      `
    ).map((r) => r.indexname as string);
    expect(indexNames).not.toContain("subcategories_category_slug_idx");
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "categories_name_unique_idx",
        "categories_slug_unique_idx",
        "categories_abbreviation_unique_idx",
        "subcategories_name_unique_idx",
        "subcategories_slug_unique_idx",
        "subcategories_abbreviation_unique_idx",
      ]),
    );

    // 0003/0004: cross-table trigger function exists and takes the lock.
    const [fn] = await historySql`
      SELECT pg_get_functiondef(oid) AS def
      FROM pg_proc
      WHERE proname = 'enforce_forum_identifier_cross_table_uniqueness'
    `;
    expect(fn?.def).toContain("pg_advisory_xact_lock");

    // 0005: profile columns on users.
    const userColumns = (
      await historySql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
      `
    ).map((r) => r.column_name as string);
    expect(userColumns).toEqual(
      expect.arrayContaining([
        "display_name",
        "date_of_birth",
        "profile_text",
        "location",
        "website",
        "photo_urls",
      ]),
    );
  });

  it("matches the structure drizzle-kit push produces from schema.ts", async () => {
    await recreateDatabase(target, PUSH_DB);

    const result = spawnSync(
      "pnpm",
      ["exec", "drizzle-kit", "push", "--force"],
      {
        cwd: resolve(import.meta.dirname, "../.."),
        env: {
          ...process.env,
          POSTGRES_HOST: target.host,
          POSTGRES_PORT: String(target.port),
          POSTGRES_DB: PUSH_DB,
          POSTGRES_USER: target.user,
          POSTGRES_PASSWORD: target.password,
        },
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    expect(
      result.status,
      `drizzle-kit push failed:\n${result.stdout}\n${result.stderr}`,
    ).toBe(0);

    const pushSql = connect(target, PUSH_DB);
    try {
      const migrated = await structure(historySql);
      const pushed = await structure(pushSql);
      expect(migrated.columns).toEqual(pushed.columns);
      expect(migrated.indexes).toEqual(pushed.indexes);
      expect(migrated.constraints).toEqual(pushed.constraints);
    } finally {
      await pushSql.end();
    }
  });
});
