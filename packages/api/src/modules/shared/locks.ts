/*
 * Transaction-scoped advisory locks (refactor plan section 5.3).
 *
 * Two locks, and one fixed acquisition order that no implementation may
 * reverse:
 *
 *   1. BOARD HIERARCHY (exclusive only) — taken by every board create,
 *      update, move, and purge, before any row lock. It gives concurrent
 *      moves a deterministic order so a cycle check cannot be invalidated
 *      between validation and write.
 *   2. FORUM CONTENT (shared for content writes, exclusive for purge) —
 *      topic, post, reaction, vote, and view writes take the SHARED form,
 *      so they never block each other; recursive purge takes the EXCLUSIVE
 *      form, so no affected content can be written while purge validates,
 *      recounts, and deletes.
 *
 * Both are pg_advisory_xact_* locks: PostgreSQL releases them at commit or
 * rollback, so a failed command can never leak one.
 */

import { sql } from "drizzle-orm";

const BOARD_HIERARCHY_LOCK = "forum_board_hierarchy";
const FORUM_CONTENT_LOCK = "forum_content";

/** Minimal surface shared by a Drizzle database handle and a transaction. */
export interface LockExecutor {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
}

export async function acquireBoardHierarchyLock(
  tx: LockExecutor,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${BOARD_HIERARCHY_LOCK}))`,
  );
}

/** Content writes: compatible with each other, blocked by purge. */
export async function acquireForumContentLockShared(
  tx: LockExecutor,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock_shared(hashtext(${FORUM_CONTENT_LOCK}))`,
  );
}

/** Purge only: waits for in-flight content writes, then excludes new ones. */
export async function acquireForumContentLockExclusive(
  tx: LockExecutor,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${FORUM_CONTENT_LOCK}))`,
  );
}
