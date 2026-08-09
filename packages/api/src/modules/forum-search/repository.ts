import { boards } from "@forum/db/schema";
import { asc, sql } from "drizzle-orm";
import type { Database } from "../../db";
import type { SearchCursor } from "./cursor";
import type { SearchSort } from "./types";

export interface SearchBoardRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  isGuestVisible: boolean;
}

export interface SearchRow {
  topicId: string;
  boardId: string;
  title: string;
  slug: string;
  replyCount: number;
  sourceText: string;
  matchKind: "topic" | "opening" | "reply";
  targetReplyId: string | null;
  matchedAt: Date;
  rank: number;
  authorId: string;
  authorName: string | null;
  authorDisplayName: string | null;
  authorImage: string | null;
  totalCount: number;
}

export interface SearchRowsInput {
  q: string;
  boardIds: string[];
  topicsOnly: boolean;
  authorId?: string;
  cutoff: Date | null;
  sort: SearchSort;
  cursor: SearchCursor | null;
  limitPlusOne: number;
}

export interface ForumSearchTx {
  allBoards(): Promise<SearchBoardRow[]>;
  searchRows(input: SearchRowsInput): Promise<SearchRow[]>;
  authorName(authorId: string): Promise<string | null>;
}

type Executor = Pick<Database, "execute" | "select">;

function createForumSearchTx(db: Executor): ForumSearchTx {
  return {
    allBoards() {
      return db
        .select({
          id: boards.id,
          parentId: boards.parentId,
          name: boards.name,
          slug: boards.slug,
          sortOrder: boards.sortOrder,
          isGuestVisible: boards.isGuestVisible,
        })
        .from(boards)
        .orderBy(asc(boards.sortOrder), asc(boards.name));
    },

    async searchRows(input) {
      if (input.boardIds.length === 0) return [];
      const boardIds = sql.join(
        input.boardIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      );
      const authorTitle = input.authorId
        ? sql`AND t.author_id = ${input.authorId}`
        : sql``;
      const authorPost = input.authorId
        ? sql`AND p.author_id = ${input.authorId}`
        : sql``;
      const titleCutoff = input.cutoff
        ? sql`AND t.created_at >= ${input.cutoff}`
        : sql``;
      const postCutoff = input.cutoff
        ? sql`AND p.created_at >= ${input.cutoff}`
        : sql``;
      const postCandidates = input.topicsOnly
        ? sql``
        : sql`
          UNION ALL
          SELECT t.id AS topic_id, t.board_id, t.title, t.slug,
            t.reply_count, p.content AS source_text, p.kind::text AS match_kind,
            CASE WHEN p.kind = 'reply' THEN p.id ELSE NULL END AS target_reply_id,
            p.created_at AS matched_at,
            ts_rank_cd(to_tsvector('simple', p.content), search.query) AS rank,
            p.author_id, u.name AS author_name, u.display_name AS author_display_name,
            u.image AS author_image
          FROM search_query search
          JOIN posts p ON to_tsvector('simple', p.content) @@ search.query
            AND p.is_deleted = false
          JOIN topics t ON t.id = p.topic_id
          JOIN users u ON u.id = p.author_id
          WHERE t.board_id IN (${boardIds}) ${authorPost} ${postCutoff}
        `;
      const representativeOrder =
        input.sort === "relevance"
          ? sql`rank DESC, matched_at DESC, topic_id DESC`
          : sql`matched_at DESC, rank DESC, topic_id DESC`;
      const pageOrder =
        input.sort === "relevance"
          ? sql`rank DESC, matched_at DESC, topic_id DESC`
          : sql`matched_at DESC, topic_id DESC`;
      const cursorPredicate = input.cursor
        ? input.sort === "relevance"
          ? sql`WHERE (rank, matched_at, topic_id) < (${input.cursor.rank}, ${input.cursor.matchedAt}::timestamp, ${input.cursor.topicId}::uuid)`
          : sql`WHERE (matched_at, topic_id) < (${input.cursor.matchedAt}::timestamp, ${input.cursor.topicId}::uuid)`
        : sql``;

      const result = await db.execute(sql`
        WITH search_query AS (
          SELECT websearch_to_tsquery('simple', ${input.q}) AS query
        ), candidates AS (
          SELECT t.id AS topic_id, t.board_id, t.title, t.slug,
            t.reply_count, opening.content AS source_text, 'topic'::text AS match_kind,
            NULL::uuid AS target_reply_id, t.created_at AS matched_at,
            ts_rank_cd(to_tsvector('simple', t.title), search.query) * 2 AS rank,
            t.author_id, u.name AS author_name, u.display_name AS author_display_name,
            u.image AS author_image
          FROM search_query search
          JOIN topics t ON to_tsvector('simple', t.title) @@ search.query
          JOIN posts opening ON opening.topic_id = t.id AND opening.kind = 'opening'
          JOIN users u ON u.id = t.author_id
          WHERE t.board_id IN (${boardIds}) ${authorTitle} ${titleCutoff}
          ${postCandidates}
        ), ranked AS (
          SELECT *, row_number() OVER (
            PARTITION BY topic_id ORDER BY ${representativeOrder}
          ) AS representative
          FROM candidates
        ), deduplicated AS (
          SELECT *, count(*) OVER ()::int AS total_count
          FROM ranked WHERE representative = 1
        )
        SELECT * FROM deduplicated
        ${cursorPredicate}
        ORDER BY ${pageOrder}
        LIMIT ${input.limitPlusOne}
      `);
      return result.map((raw) => {
        const row = raw as Record<string, unknown>;
        return {
          topicId: String(row.topic_id),
          boardId: String(row.board_id),
          title: String(row.title),
          slug: String(row.slug),
          replyCount: Number(row.reply_count),
          sourceText: String(row.source_text),
          matchKind: row.match_kind as SearchRow["matchKind"],
          targetReplyId: row.target_reply_id
            ? String(row.target_reply_id)
            : null,
          // PostgreSQL `timestamp without time zone` may arrive as a string.
          // Forum timestamps are stored as UTC, so make that boundary explicit
          // instead of letting the API process's local timezone shift cursors.
          matchedAt:
            row.matched_at instanceof Date
              ? row.matched_at
              : new Date(`${String(row.matched_at)}Z`),
          rank: Number(row.rank),
          authorId: String(row.author_id),
          authorName: row.author_name ? String(row.author_name) : null,
          authorDisplayName: row.author_display_name
            ? String(row.author_display_name)
            : null,
          authorImage: row.author_image ? String(row.author_image) : null,
          totalCount: Number(row.total_count),
        };
      });
    },

    async authorName(authorId) {
      const rows = await db.execute(sql`
        SELECT coalesce(display_name, name) AS name FROM users WHERE id = ${authorId}
      `);
      const row = rows[0] as { name?: string | null } | undefined;
      return row?.name ?? null;
    },
  };
}

export interface ForumSearchStore {
  transaction<T>(run: (tx: ForumSearchTx) => Promise<T>): Promise<T>;
}

export function createForumSearchStore(db: Database): ForumSearchStore {
  return {
    transaction(run) {
      return db.transaction(async (tx) => run(createForumSearchTx(tx)), {
        isolationLevel: "repeatable read",
        accessMode: "read only",
      });
    },
  };
}
