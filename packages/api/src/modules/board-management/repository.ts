/*
 * Transaction-aware persistence for board management (plan section 5.3).
 * Commands receive this store; they never call the global getDb(). Every
 * command runs inside exactly one store.transaction(), which takes the
 * advisory locks in the fixed order before touching rows.
 */

import { boards } from "@forum/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
  acquireBoardHierarchyLock,
  acquireForumContentLockExclusive,
} from "../shared/locks";
import type { BoardNode } from "./hierarchy-policy";
import type { BoardPurgeImpactCounts } from "./types";

export interface BoardRecord extends BoardNode {
  name: string;
  slug: string;
  abbreviation: string;
  sortOrder: number;
}

export type IdentifierField = "name" | "slug" | "abbreviation";

export interface BoardManagementTx {
  /** All boards as a lookup map, for cycle checks and ancestry. */
  allBoards(): Promise<Map<string, BoardRecord>>;
  findBoard(boardId: string): Promise<BoardRecord | null>;
  /** Case-insensitive sibling conflict under `parentId`, excluding a board. */
  findSiblingConflict(
    parentId: string | null,
    values: Partial<Record<IdentifierField, string>>,
    excludeBoardId?: string,
  ): Promise<IdentifierField | null>;
  insertBoard(values: {
    parentId: string | null;
    name: string;
    slug: string;
    abbreviation: string;
    description: string | null;
    icon: string | null;
    sortOrder: number;
    now: Date;
  }): Promise<string>;
  updateBoard(
    boardId: string,
    values: Partial<{
      name: string;
      slug: string;
      abbreviation: string;
      description: string | null;
      icon: string | null;
      sortOrder: number;
    }>,
    now: Date,
  ): Promise<void>;
  moveBoard(
    boardId: string,
    newParentId: string | null,
    sortOrder: number,
    now: Date,
  ): Promise<void>;
  countSubtree(boardId: string): Promise<BoardPurgeImpactCounts>;
  deleteBoardTree(boardId: string): Promise<void>;
  /** Purge only: excludes every content write for the rest of the tx. */
  lockForumContentExclusive(): Promise<void>;
}

export interface BoardManagementStore {
  transaction<T>(fn: (tx: BoardManagementTx) => Promise<T>): Promise<T>;
}

export function createDrizzleBoardManagementStore(
  db: Database,
): BoardManagementStore {
  return {
    transaction(fn) {
      return db.transaction(async (tx) => {
        // Hierarchy lock first, always — before row locks and before the
        // forum-content lock (plan section 5.3).
        await acquireBoardHierarchyLock(tx);

        const ops: BoardManagementTx = {
          async allBoards() {
            const rows = await tx
              .select({
                id: boards.id,
                parentId: boards.parentId,
                name: boards.name,
                slug: boards.slug,
                abbreviation: boards.abbreviation,
                sortOrder: boards.sortOrder,
              })
              .from(boards);
            return new Map(rows.map((row) => [row.id, row]));
          },

          async findBoard(boardId) {
            const rows = await tx
              .select({
                id: boards.id,
                parentId: boards.parentId,
                name: boards.name,
                slug: boards.slug,
                abbreviation: boards.abbreviation,
                sortOrder: boards.sortOrder,
              })
              .from(boards)
              .where(eq(boards.id, boardId))
              .limit(1);
            return rows[0] ?? null;
          },

          async findSiblingConflict(parentId, values, excludeBoardId) {
            const sameParent =
              parentId === null
                ? sql`${boards.parentId} IS NULL`
                : eq(boards.parentId, parentId);

            const checks: Array<[IdentifierField, string | undefined]> = [
              ["name", values.name],
              ["slug", values.slug],
              ["abbreviation", values.abbreviation],
            ];

            for (const [field, value] of checks) {
              if (value === undefined) continue;
              const column =
                field === "name"
                  ? boards.name
                  : field === "slug"
                    ? boards.slug
                    : boards.abbreviation;
              const matches = sql`lower(${column}) = lower(${value})`;
              const rows = await tx
                .select({ id: boards.id })
                .from(boards)
                .where(
                  excludeBoardId
                    ? and(sameParent, matches, ne(boards.id, excludeBoardId))
                    : and(sameParent, matches),
                )
                .limit(1);
              if (rows.length > 0) return field;
            }
            return null;
          },

          async insertBoard(values) {
            const [row] = await tx
              .insert(boards)
              .values({
                parentId: values.parentId,
                name: values.name,
                slug: values.slug,
                abbreviation: values.abbreviation,
                description: values.description,
                icon: values.icon,
                sortOrder: values.sortOrder,
                createdAt: values.now,
                updatedAt: values.now,
              })
              .returning({ id: boards.id });
            return row.id;
          },

          async updateBoard(boardId, values, now) {
            await tx
              .update(boards)
              .set({ ...values, updatedAt: now })
              .where(eq(boards.id, boardId));
          },

          async moveBoard(boardId, newParentId, sortOrder, now) {
            await tx
              .update(boards)
              .set({ parentId: newParentId, sortOrder, updatedAt: now })
              .where(eq(boards.id, boardId));
          },

          async countSubtree(boardId) {
            const rows = await tx.execute(sql`
              WITH RECURSIVE subtree AS (
                SELECT id FROM boards WHERE id = ${boardId}
                UNION ALL
                SELECT b.id FROM boards b JOIN subtree s ON b.parent_id = s.id
              ),
              subtree_topics AS (
                SELECT t.id FROM topics t JOIN subtree s ON t.board_id = s.id
              ),
              subtree_posts AS (
                SELECT p.id FROM posts p
                JOIN subtree_topics st ON p.topic_id = st.id
              )
              SELECT
                (SELECT count(*) FROM subtree)::int AS boards,
                (SELECT count(*) FROM subtree_topics)::int AS topics,
                (SELECT count(*) FROM subtree_posts)::int AS posts,
                (SELECT count(*) FROM reactions r
                   JOIN subtree_posts sp ON r.post_id = sp.id)::int AS reactions,
                (SELECT count(*) FROM votes v
                   JOIN subtree_posts sp ON v.post_id = sp.id)::int AS votes,
                (SELECT count(*) FROM topic_views tv
                   JOIN subtree_topics st ON tv.topic_id = st.id)::int
                   AS topic_views
            `);
            const row = (rows as unknown as Array<Record<string, number>>)[0];
            return {
              boards: Number(row.boards),
              topics: Number(row.topics),
              posts: Number(row.posts),
              reactions: Number(row.reactions),
              votes: Number(row.votes),
              topicViews: Number(row.topic_views),
            };
          },

          async deleteBoardTree(boardId) {
            // ON DELETE CASCADE removes descendant boards, their topics,
            // posts, reactions, votes, and view records in one statement.
            await tx.delete(boards).where(eq(boards.id, boardId));
          },

          async lockForumContentExclusive() {
            await acquireForumContentLockExclusive(tx);
          },
        };

        return fn(ops);
      });
    },
  };
}
