/*
 * Transaction-aware persistence for the topic discussion module (refactor
 * plan section 5.1). The store is INJECTED into commands — modules never
 * call the global getDb(). Every command runs inside exactly one
 * store.transaction(), and the tx-scoped operations below are the only way
 * commands touch the database.
 */

import {
  notifications,
  posts,
  topicSubscriptions,
  topics,
  topicViews,
  users,
} from "@forum/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import type { HierarchyBoardRow } from "../shared/board-hierarchy";
import { acquireForumContentLockShared } from "../shared/locks";
import type { QuoteSnapshotV1 } from "../shared/quote-snapshot";
import { topicSlugConflict } from "./errors";

export interface LockedTopic {
  id: string;
  isLocked: boolean;
  createdAt: Date;
}

export interface QuotablePost {
  id: string;
  topicId: string;
  content: string;
  createdAt: Date;
  isDeleted: boolean;
  authorName: string | null;
}

export interface PostRecord {
  id: string;
  topicId: string;
  authorId: string;
  kind: "opening" | "reply" | null;
  isDeleted: boolean;
}

export interface TopicDiscussionTx {
  /** Root-first policy is derived from this transaction's ancestry snapshot. */
  boardAncestry(
    boardId: string,
  ): Promise<Array<HierarchyBoardRow & { allowNewTopics: boolean }>>;
  topicSlugTaken(slug: string): Promise<boolean>;
  insertTopic(values: {
    boardId: string;
    authorId: string;
    title: string;
    slug: string;
    now: Date;
  }): Promise<string>;
  insertOpeningPost(values: {
    topicId: string;
    authorId: string;
    content: string;
    now: Date;
  }): Promise<string>;
  subscribeAuthor(topicId: string, userId: string, now: Date): Promise<void>;
  /** SELECT ... FOR UPDATE: serializes replies/deletes per topic. */
  lockTopic(topicId: string): Promise<LockedTopic | null>;
  findQuotablePost(postId: string): Promise<QuotablePost | null>;
  insertReply(values: {
    topicId: string;
    authorId: string;
    content: string;
    quoteSnapshot: QuoteSnapshotV1 | null;
    now: Date;
  }): Promise<string>;
  bumpTopicActivity(topicId: string, now: Date): Promise<void>;
  notifySubscribers(values: {
    topicId: string;
    postId: string;
    replyingUserId: string;
    now: Date;
  }): Promise<void>;
  findPost(postId: string): Promise<PostRecord | null>;
  updatePostContent(postId: string, content: string, now: Date): Promise<void>;
  /** True only for the one active-to-deleted state transition. */
  softDeletePost(postId: string, now: Date): Promise<boolean>;
  decrementReplyCount(topicId: string): Promise<void>;
  latestActiveReplyAt(topicId: string): Promise<Date | null>;
  setLastActivity(topicId: string, at: Date): Promise<void>;
  topicExists(topicId: string): Promise<boolean>;
  /** Conflict-ignoring insert; true when this session counted for the first time. */
  recordView(
    topicId: string,
    browserSessionId: string,
    now: Date,
  ): Promise<boolean>;
  incrementViewCount(topicId: string): Promise<void>;
}

export interface TopicDiscussionStore {
  transaction<T>(fn: (tx: TopicDiscussionTx) => Promise<T>): Promise<T>;
}

function isUniqueConstraint(error: unknown, constraint: string): boolean {
  let current = error;
  // Drizzle may wrap the postgres-js error, so inspect the bounded cause
  // chain while requiring both SQLSTATE and the exact authoritative index.
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current !== "object") return false;
    const code = "code" in current ? current.code : undefined;
    const constraintName =
      "constraint_name" in current ? current.constraint_name : undefined;
    if (code === "23505" && constraintName === constraint) return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

export function createDrizzleTopicDiscussionStore(
  db: Database,
): TopicDiscussionStore {
  return {
    transaction(fn) {
      return db.transaction(async (tx) => {
        /*
         * Every topic/post/view write takes the SHARED forum-content lock
         * (plan section 5.3): concurrent writes never block each other, but
         * all of them block behind an in-flight recursive board purge, so
         * purge cannot delete content that is mid-write.
         */
        await acquireForumContentLockShared(tx);

        const ops: TopicDiscussionTx = {
          async boardAncestry(boardId) {
            /*
             * One recursive statement keeps arbitrary-depth ancestry in the
             * same transaction as Topic creation. Quoted aliases preserve the
             * persistence-neutral hierarchy contract consumed by commands.
             */
            const rows = await tx.execute(sql`
              WITH RECURSIVE ancestry AS (
                SELECT id, parent_id, name, slug, sort_order, allow_new_topics
                FROM boards
                WHERE id = ${boardId}
                UNION ALL
                SELECT b.id, b.parent_id, b.name, b.slug, b.sort_order, b.allow_new_topics
                FROM boards b
                JOIN ancestry a ON b.id = a.parent_id
              )
              SELECT
                id,
                parent_id AS "parentId",
                name,
                slug,
                sort_order AS "sortOrder",
                allow_new_topics AS "allowNewTopics"
              FROM ancestry
            `);
            return rows as unknown as Array<
              HierarchyBoardRow & { allowNewTopics: boolean }
            >;
          },

          async topicSlugTaken(slug) {
            const rows = await tx
              .select({ id: topics.id })
              .from(topics)
              .where(sql`lower(${topics.slug}) = lower(${slug})`)
              .limit(1);
            return rows.length > 0;
          },

          async insertTopic({ boardId, authorId, title, slug, now }) {
            try {
              const [row] = await tx
                .insert(topics)
                .values({
                  boardId,
                  authorId,
                  title,
                  slug,
                  replyCount: 0,
                  lastActivityAt: now,
                  createdAt: now,
                })
                .returning({ id: topics.id });
              return row.id;
            } catch (error) {
              if (isUniqueConstraint(error, "topics_slug_unique_idx")) {
                throw topicSlugConflict(slug);
              }
              throw error;
            }
          },

          async insertOpeningPost({ topicId, authorId, content, now }) {
            const [row] = await tx
              .insert(posts)
              .values({
                topicId,
                authorId,
                content,
                kind: "opening",
                createdAt: now,
              })
              .returning({ id: posts.id });
            return row.id;
          },

          async subscribeAuthor(topicId, userId, now) {
            await tx
              .insert(topicSubscriptions)
              .values({ topicId, userId, createdAt: now })
              .onConflictDoNothing();
          },

          async lockTopic(topicId) {
            const rows = await tx
              .select({
                id: topics.id,
                isLocked: topics.isLocked,
                createdAt: topics.createdAt,
              })
              .from(topics)
              .where(eq(topics.id, topicId))
              .limit(1)
              .for("update");
            return rows[0] ?? null;
          },

          async findQuotablePost(postId) {
            const rows = await tx
              .select({
                id: posts.id,
                topicId: posts.topicId,
                content: posts.content,
                createdAt: posts.createdAt,
                isDeleted: posts.isDeleted,
                authorName: users.name,
              })
              .from(posts)
              .leftJoin(users, eq(posts.authorId, users.id))
              .where(eq(posts.id, postId))
              .limit(1);
            return rows[0] ?? null;
          },

          async insertReply({
            topicId,
            authorId,
            content,
            quoteSnapshot,
            now,
          }) {
            const [row] = await tx
              .insert(posts)
              .values({
                topicId,
                authorId,
                content,
                kind: "reply",
                quoteSnapshot,
                createdAt: now,
              })
              .returning({ id: posts.id });
            return row.id;
          },

          async bumpTopicActivity(topicId, now) {
            await tx
              .update(topics)
              .set({
                replyCount: sql`coalesce(${topics.replyCount}, 0) + 1`,
                lastActivityAt: now,
              })
              .where(eq(topics.id, topicId));
          },

          async notifySubscribers({ topicId, postId, replyingUserId, now }) {
            /*
             * Set-based fan-out is part of the reply transaction. Self-replies
             * are suppressed and the unique index makes retries for one post
             * harmless without hiding duplicate reply submissions.
             */
            await tx.execute(sql`
              INSERT INTO ${notifications} (
                recipient_id,
                kind,
                post_id,
                created_at
              )
              SELECT
                ${topicSubscriptions.userId},
                'topic_reply',
                ${postId}::uuid,
                ${now.toISOString()}::timestamp
              FROM ${topicSubscriptions}
              WHERE ${topicSubscriptions.topicId} = ${topicId}::uuid
                AND ${topicSubscriptions.userId} <> ${replyingUserId}
              ON CONFLICT (recipient_id, kind, post_id) DO NOTHING
            `);
          },

          async findPost(postId) {
            const rows = await tx
              .select({
                id: posts.id,
                topicId: posts.topicId,
                authorId: posts.authorId,
                kind: posts.kind,
                isDeleted: posts.isDeleted,
              })
              .from(posts)
              .where(eq(posts.id, postId))
              .limit(1);
            return rows[0] ?? null;
          },

          async updatePostContent(postId, content, now) {
            await tx
              .update(posts)
              .set({ content, editedAt: now })
              .where(eq(posts.id, postId));
          },

          async softDeletePost(postId, now) {
            const rows = await tx
              .update(posts)
              .set({ isDeleted: true, deletedAt: now })
              .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
              .returning({ id: posts.id });
            return rows.length > 0;
          },

          async decrementReplyCount(topicId) {
            await tx
              .update(topics)
              .set({
                replyCount: sql`greatest(coalesce(${topics.replyCount}, 0) - 1, 0)`,
              })
              .where(eq(topics.id, topicId));
          },

          async latestActiveReplyAt(topicId) {
            const rows = await tx
              .select({ createdAt: posts.createdAt })
              .from(posts)
              .where(
                and(
                  eq(posts.topicId, topicId),
                  eq(posts.kind, "reply"),
                  eq(posts.isDeleted, false),
                ),
              )
              .orderBy(desc(posts.createdAt), desc(posts.id))
              .limit(1);
            return rows[0]?.createdAt ?? null;
          },

          async setLastActivity(topicId, at) {
            await tx
              .update(topics)
              .set({ lastActivityAt: at })
              .where(eq(topics.id, topicId));
          },

          async topicExists(topicId) {
            const rows = await tx
              .select({ id: topics.id })
              .from(topics)
              .where(eq(topics.id, topicId))
              .limit(1);
            return rows.length > 0;
          },

          async recordView(topicId, browserSessionId, now) {
            const rows = await tx
              .insert(topicViews)
              .values({ topicId, browserSessionId, createdAt: now })
              .onConflictDoNothing()
              .returning({ topicId: topicViews.topicId });
            return rows.length > 0;
          },

          async incrementViewCount(topicId) {
            await tx
              .update(topics)
              .set({ viewCount: sql`${topics.viewCount} + 1` })
              .where(eq(topics.id, topicId));
          },
        };

        return fn(ops);
      });
    },
  };
}
