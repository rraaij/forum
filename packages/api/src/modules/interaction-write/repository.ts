/*
 * Persistence for reaction and vote writes (plan section 5.6). This is NOT
 * a redesign: the behavior matches the previous route handlers exactly. The
 * module exists so these writes leave the adapters and take the SHARED
 * forum-content advisory lock in the same transaction as their mutation,
 * which is what makes recursive purge safe.
 */

import { reactions, votes } from "@forum/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { acquireForumContentLockShared } from "../shared/locks";

export interface InteractionWriteTx {
  findReaction(
    postId: string,
    userId: string,
    emoji: string,
  ): Promise<{ id: string } | null>;
  deleteReaction(id: string): Promise<void>;
  insertReaction(
    postId: string,
    userId: string,
    emoji: string,
  ): Promise<{ id: string }>;
  findVote(
    postId: string,
    userId: string,
  ): Promise<{ id: string; value: number } | null>;
  deleteVote(id: string): Promise<void>;
  updateVote(id: string, value: number): Promise<void>;
  insertVote(
    postId: string,
    userId: string,
    value: number,
  ): Promise<{ id: string }>;
}

export interface InteractionWriteStore {
  transaction<T>(fn: (tx: InteractionWriteTx) => Promise<T>): Promise<T>;
  /** Reaction totals per emoji for one post. */
  reactionCounts(postId: string): Promise<{ emoji: string; count: number }[]>;
  /** Summed vote value for one post; 0 when nothing is recorded. */
  voteScore(postId: string): Promise<number>;
}

export function createDrizzleInteractionWriteStore(
  db: Database,
): InteractionWriteStore {
  return {
    async reactionCounts(postId) {
      return db
        .select({ emoji: reactions.emoji, count: sql<number>`count(*)::int` })
        .from(reactions)
        .where(eq(reactions.postId, postId))
        .groupBy(reactions.emoji);
    },

    async voteScore(postId) {
      const [row] = await db
        .select({
          score: sql<number>`coalesce(sum(${votes.value}), 0)::int`,
        })
        .from(votes)
        .where(eq(votes.postId, postId));
      return row?.score ?? 0;
    },

    transaction(fn) {
      return db.transaction(async (tx) => {
        // Shared: concurrent interaction writes never block each other, but
        // all of them block behind an in-flight recursive purge.
        await acquireForumContentLockShared(tx);

        const ops: InteractionWriteTx = {
          async findReaction(postId, userId, emoji) {
            const rows = await tx
              .select({ id: reactions.id })
              .from(reactions)
              .where(
                and(
                  eq(reactions.postId, postId),
                  eq(reactions.userId, userId),
                  eq(reactions.emoji, emoji),
                ),
              )
              .limit(1);
            return rows[0] ?? null;
          },

          async deleteReaction(id) {
            await tx.delete(reactions).where(eq(reactions.id, id));
          },

          async insertReaction(postId, userId, emoji) {
            const [row] = await tx
              .insert(reactions)
              .values({ postId, userId, emoji })
              .returning({ id: reactions.id });
            return row;
          },

          async findVote(postId, userId) {
            const rows = await tx
              .select({ id: votes.id, value: votes.value })
              .from(votes)
              .where(and(eq(votes.postId, postId), eq(votes.userId, userId)))
              .limit(1);
            return rows[0] ?? null;
          },

          async deleteVote(id) {
            await tx.delete(votes).where(eq(votes.id, id));
          },

          async updateVote(id, value) {
            await tx.update(votes).set({ value }).where(eq(votes.id, id));
          },

          async insertVote(postId, userId, value) {
            const [row] = await tx
              .insert(votes)
              .values({ postId, userId, value })
              .returning({ id: votes.id });
            return row;
          },
        };

        return fn(ops);
      });
    },
  };
}
