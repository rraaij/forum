import { randomUUID } from "node:crypto";
import { testSql } from "./db";

/*
 * Direct-SQL fixtures for module-level tests. HTTP-level tests keep using
 * the real Better Auth sign-up endpoint; module tests only need rows.
 */

export async function insertUser(name: string): Promise<string> {
  const id = `user-${name}-${randomUUID().slice(0, 8)}`;
  await testSql()`
    INSERT INTO users (id, name, email)
    VALUES (${id}, ${name}, ${`${id}@example.test`})
  `;
  return id;
}

export async function insertBoard(
  name: string,
  parentId: string | null = null,
): Promise<string> {
  const rows = await testSql()`
    INSERT INTO boards (parent_id, name, slug, abbreviation)
    VALUES (${parentId}, ${name}, ${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}, ${name.slice(0, 5).toUpperCase()})
    RETURNING id
  `;
  return rows[0].id as string;
}
