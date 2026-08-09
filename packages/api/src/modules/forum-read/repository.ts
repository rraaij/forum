/*
 * Data access for the forum read model (refactor plan section 5.2).
 * A FIXED number of queries per page — never one query per board. The
 * keyset predicates use PostgreSQL row comparison so they match the
 * (board_id, is_pinned DESC, last_activity_at DESC, id DESC) and
 * (topic_id, created_at ASC, id ASC) indexes exactly.
 */

import { boards, posts, topics, users } from "@forum/db/schema";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Database } from "../../db";
import type { ReplyCursor, TopicCursor } from "../shared/pagination";

export interface BoardRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  abbreviation: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isGuestVisible: boolean;
  allowNewTopics: boolean;
}

export interface BoardActivityRow {
  boardId: string;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  at: Date;
  replyCount: number | null;
  authorId: string;
  authorName: string | null;
  authorDisplayName: string | null;
  authorImage: string | null;
}

export interface TopicPageRow {
  id: string;
  slug: string;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number | null;
  viewCount: number;
  createdAt: Date;
  lastActivityAt: Date;
  authorId: string;
  authorName: string | null;
  authorDisplayName: string | null;
  authorImage: string | null;
}

export interface TopicHeaderRow extends TopicPageRow {
  boardId: string;
}

export interface PostRow {
  id: string;
  kind: "opening" | "reply" | null;
  content: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
  quoteSnapshot: unknown;
  authorId: string;
  authorName: string | null;
  authorDisplayName: string | null;
  authorImage: string | null;
  authorCreatedAt: Date | null;
  authorProfileText: string | null;
  authorRole: string | null;
}

export interface ReplyTarget {
  id: string;
  createdAt: Date;
  startIndex: number;
}

const topicAuthorColumns = {
  authorId: topics.authorId,
  authorName: users.name,
  authorDisplayName: users.displayName,
  authorImage: users.image,
};

export interface ForumReadTx {
  allBoards(): Promise<BoardRow[]>;
  /** Direct (non-recursive) topic counts per board, one grouped query. */
  directTopicCounts(): Promise<Map<string, number>>;
  /** Direct retained post counts per board, one grouped query. */
  directPostCounts(): Promise<Map<string, number>>;
  /** Latest direct topic activity per board, one DISTINCT ON query. */
  latestActivityByBoard(): Promise<Map<string, BoardActivityRow>>;
  topicPage(
    boardId: string,
    cursor: TopicCursor | null,
    limitPlusOne: number,
  ): Promise<TopicPageRow[]>;
  topicHeaderBySlug(slug: string): Promise<TopicHeaderRow | null>;
  openingPost(topicId: string): Promise<PostRow | null>;
  replyPage(
    topicId: string,
    cursor: ReplyCursor | null,
    limitPlusOne: number,
    inclusive?: boolean,
  ): Promise<PostRow[]>;
  replyTarget(topicId: string, replyId: string): Promise<ReplyTarget | null>;
  /** Lifetime post totals for all authors on the current page, one query. */
  postCountsByAuthor(authorIds: string[]): Promise<Map<string, number>>;
}

type ForumReadExecutor = Pick<
  Database,
  "execute" | "select" | "selectDistinctOn"
>;

function createForumReadTx(db: ForumReadExecutor): ForumReadTx {
  return {
    async allBoards() {
      return db
        .select({
          id: boards.id,
          parentId: boards.parentId,
          name: boards.name,
          slug: boards.slug,
          abbreviation: boards.abbreviation,
          description: boards.description,
          icon: boards.icon,
          sortOrder: boards.sortOrder,
          isGuestVisible: boards.isGuestVisible,
          allowNewTopics: boards.allowNewTopics,
        })
        .from(boards);
    },

    async directTopicCounts() {
      const rows = await db
        .select({
          boardId: topics.boardId,
          topicCount: sql<number>`count(*)::int`,
        })
        .from(topics)
        .where(isNotNull(topics.boardId))
        .groupBy(topics.boardId);
      const map = new Map<string, number>();
      for (const row of rows) {
        if (row.boardId) map.set(row.boardId, row.topicCount);
      }
      return map;
    },

    async directPostCounts() {
      const rows = await db
        .select({
          boardId: topics.boardId,
          postCount: sql<number>`count(${posts.id})::int`,
        })
        .from(posts)
        .innerJoin(topics, eq(posts.topicId, topics.id))
        .where(isNotNull(topics.boardId))
        .groupBy(topics.boardId);
      const map = new Map<string, number>();
      for (const row of rows) {
        if (row.boardId) map.set(row.boardId, row.postCount);
      }
      return map;
    },

    async latestActivityByBoard() {
      const rows = await db
        .selectDistinctOn([topics.boardId], {
          boardId: topics.boardId,
          topicId: topics.id,
          topicTitle: topics.title,
          topicSlug: topics.slug,
          at: topics.lastActivityAt,
          replyCount: topics.replyCount,
          ...topicAuthorColumns,
        })
        .from(topics)
        .leftJoin(users, eq(topics.authorId, users.id))
        .where(isNotNull(topics.boardId))
        .orderBy(topics.boardId, desc(topics.lastActivityAt), desc(topics.id));
      const map = new Map<string, BoardActivityRow>();
      for (const row of rows) {
        if (row.boardId && row.at) {
          map.set(row.boardId, {
            boardId: row.boardId,
            topicId: row.topicId,
            topicTitle: row.topicTitle,
            topicSlug: row.topicSlug,
            at: row.at,
            replyCount: row.replyCount,
            authorId: row.authorId,
            authorName: row.authorName,
            authorDisplayName: row.authorDisplayName,
            authorImage: row.authorImage,
          });
        }
      }
      return map;
    },

    async topicPage(boardId, cursor, limitPlusOne) {
      const seek = cursor
        ? sql`(${topics.isPinned}, ${topics.lastActivityAt}, ${topics.id}) < (${cursor.isPinned}, cast(${cursor.lastActivityAt} as timestamp), cast(${cursor.id} as uuid))`
        : undefined;
      const rows = await db
        .select({
          id: topics.id,
          slug: topics.slug,
          title: topics.title,
          isPinned: topics.isPinned,
          isLocked: topics.isLocked,
          replyCount: topics.replyCount,
          viewCount: topics.viewCount,
          createdAt: topics.createdAt,
          lastActivityAt: topics.lastActivityAt,
          ...topicAuthorColumns,
        })
        .from(topics)
        .leftJoin(users, eq(topics.authorId, users.id))
        .where(and(eq(topics.boardId, boardId), seek))
        .orderBy(
          desc(topics.isPinned),
          desc(topics.lastActivityAt),
          desc(topics.id),
        )
        .limit(limitPlusOne);
      return rows as TopicPageRow[];
    },

    async topicHeaderBySlug(slug) {
      const rows = await db
        .select({
          id: topics.id,
          boardId: topics.boardId,
          slug: topics.slug,
          title: topics.title,
          isPinned: topics.isPinned,
          isLocked: topics.isLocked,
          replyCount: topics.replyCount,
          viewCount: topics.viewCount,
          createdAt: topics.createdAt,
          lastActivityAt: topics.lastActivityAt,
          ...topicAuthorColumns,
        })
        .from(topics)
        .leftJoin(users, eq(topics.authorId, users.id))
        .where(
          and(
            sql`lower(${topics.slug}) = lower(${slug})`,
            isNotNull(topics.boardId),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row?.boardId || !row.lastActivityAt) return null;
      return row as TopicHeaderRow;
    },

    async openingPost(topicId) {
      const rows = await db
        .select({
          id: posts.id,
          kind: posts.kind,
          content: posts.content,
          isDeleted: posts.isDeleted,
          deletedAt: posts.deletedAt,
          editedAt: posts.editedAt,
          createdAt: posts.createdAt,
          quoteSnapshot: posts.quoteSnapshot,
          authorId: posts.authorId,
          authorName: users.name,
          authorDisplayName: users.displayName,
          authorImage: users.image,
          authorCreatedAt: users.createdAt,
          authorProfileText: users.profileText,
          authorRole: users.role,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(eq(posts.topicId, topicId), eq(posts.kind, "opening")))
        .limit(1);
      return rows[0] ?? null;
    },

    async replyPage(topicId, cursor, limitPlusOne, inclusive = false) {
      const seek = cursor
        ? inclusive
          ? sql`(${posts.createdAt}, ${posts.id}) >= (cast(${cursor.createdAt} as timestamp), cast(${cursor.id} as uuid))`
          : sql`(${posts.createdAt}, ${posts.id}) > (cast(${cursor.createdAt} as timestamp), cast(${cursor.id} as uuid))`
        : undefined;
      return db
        .select({
          id: posts.id,
          kind: posts.kind,
          content: posts.content,
          isDeleted: posts.isDeleted,
          deletedAt: posts.deletedAt,
          editedAt: posts.editedAt,
          createdAt: posts.createdAt,
          quoteSnapshot: posts.quoteSnapshot,
          authorId: posts.authorId,
          authorName: users.name,
          authorDisplayName: users.displayName,
          authorImage: users.image,
          authorCreatedAt: users.createdAt,
          authorProfileText: users.profileText,
          authorRole: users.role,
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(eq(posts.topicId, topicId), eq(posts.kind, "reply"), seek))
        .orderBy(asc(posts.createdAt), asc(posts.id))
        .limit(limitPlusOne);
    },

    async replyTarget(topicId, replyId) {
      const rows = await db.execute(sql`
        SELECT
          target.id,
          target.created_at AS "createdAt",
          count(previous.id)::int AS "startIndex"
        FROM posts target
        LEFT JOIN posts previous
          ON previous.topic_id = target.topic_id
          AND previous.kind = 'reply'
          AND (previous.created_at, previous.id) < (target.created_at, target.id)
        WHERE target.id = ${replyId}::uuid
          AND target.topic_id = ${topicId}::uuid
          AND target.kind = 'reply'
        GROUP BY target.id, target.created_at
      `);
      const row = rows[0] as
        | { id: string; createdAt: string | Date; startIndex: number }
        | undefined;
      return row
        ? {
            id: row.id,
            createdAt:
              row.createdAt instanceof Date
                ? row.createdAt
                : new Date(`${row.createdAt}Z`),
            startIndex: row.startIndex,
          }
        : null;
    },

    async postCountsByAuthor(authorIds) {
      if (authorIds.length === 0) return new Map();

      const rows = await db
        .select({
          authorId: posts.authorId,
          postCount: sql<number>`count(*)::int`,
        })
        .from(posts)
        .where(inArray(posts.authorId, authorIds))
        .groupBy(posts.authorId);
      return new Map(rows.map((row) => [row.authorId, row.postCount]));
    },
  };
}

export interface ForumReadStore {
  transaction<T>(run: (tx: ForumReadTx) => Promise<T>): Promise<T>;
}

export function createForumReadStore(db: Database): ForumReadStore {
  return {
    transaction(run) {
      /*
       * A page read spans several statements. REPEATABLE READ gives every
       * statement one committed snapshot; READ COMMITTED could combine a
       * hierarchy from before a purge with topics from after it. Read-only
       * also makes the query module's non-mutating boundary enforceable by
       * PostgreSQL rather than relying only on convention.
       */
      return db.transaction(async (tx) => run(createForumReadTx(tx)), {
        isolationLevel: "repeatable read",
        accessMode: "read only",
      });
    },
  };
}
