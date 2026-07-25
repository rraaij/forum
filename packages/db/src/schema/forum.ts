import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/*
 * ── Redesigned forum schema (refactor plan section 4) ─────────────────────
 * Added ADDITIVELY beside the legacy categories/subcategories model during
 * the expand phase. New topic/post columns stay nullable until the Phase 8
 * contract/reset migration; legacy tables and columns are untouched here.
 */

export const postKind = pgEnum("post_kind", ["opening", "reply"]);

// One arbitrary-depth adjacency list. A root board is presented as a
// category, a non-root board as a subcategory. ON DELETE CASCADE is
// deliberate: recursive deletion is an explicit, confirmed admin command.
export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => boards.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    abbreviation: varchar("abbreviation", { length: 5 }).notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Case-insensitive uniqueness among roots and among siblings, for every
    // admin-facing identifier, so conflict errors stay deterministic.
    uniqueIndex("boards_root_slug_unique_idx")
      .on(sql`lower(${table.slug})`)
      .where(sql`${table.parentId} IS NULL`),
    uniqueIndex("boards_sibling_slug_unique_idx")
      .on(table.parentId, sql`lower(${table.slug})`)
      .where(sql`${table.parentId} IS NOT NULL`),
    uniqueIndex("boards_root_name_unique_idx")
      .on(sql`lower(${table.name})`)
      .where(sql`${table.parentId} IS NULL`),
    uniqueIndex("boards_sibling_name_unique_idx")
      .on(table.parentId, sql`lower(${table.name})`)
      .where(sql`${table.parentId} IS NOT NULL`),
    uniqueIndex("boards_root_abbreviation_unique_idx")
      .on(sql`lower(${table.abbreviation})`)
      .where(sql`${table.parentId} IS NULL`),
    uniqueIndex("boards_sibling_abbreviation_unique_idx")
      .on(table.parentId, sql`lower(${table.abbreviation})`)
      .where(sql`${table.parentId} IS NOT NULL`),
    index("boards_parent_traversal_idx").on(
      table.parentId,
      table.sortOrder,
      table.name,
    ),
    check("boards_no_self_parent_check", sql`${table.id} <> ${table.parentId}`),
    check("boards_sort_order_check", sql`${table.sortOrder} >= 0`),
    // Deeper cycle prevention lives in an authoritative trigger with a
    // recursive CTE (custom SQL in the additive migration); the module
    // repeats the check for a useful typed error.
  ],
);

// Explicit view-dedup ledger: one row per topic per browser session. Rows
// older than 30 days may be purged by a documented maintenance query; the
// accumulated topics.view_count remains.
export const topicViews = pgTable(
  "topic_views",
  {
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    browserSessionId: uuid("browser_session_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.browserSessionId] })],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // Five characters are enough for the compact forum code shown in headers.
    abbreviation: varchar("abbreviation", { length: 5 }).notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Expression indexes enforce uniqueness regardless of letter casing.
    uniqueIndex("categories_name_unique_idx").on(sql`lower(${table.name})`),
    uniqueIndex("categories_slug_unique_idx").on(sql`lower(${table.slug})`),
    uniqueIndex("categories_abbreviation_unique_idx").on(
      sql`lower(${table.abbreviation})`,
    ),
  ],
);

export const subcategories = pgTable(
  "subcategories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    parentSubcategoryId: uuid("parent_subcategory_id").references(
      (): AnyPgColumn => subcategories.id,
      { onDelete: "cascade" },
    ),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // Subforums use the same compact five-character code as top-level boards.
    abbreviation: varchar("abbreviation", { length: 5 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subcategories_name_unique_idx").on(sql`lower(${table.name})`),
    uniqueIndex("subcategories_slug_unique_idx").on(sql`lower(${table.slug})`),
    uniqueIndex("subcategories_abbreviation_unique_idx").on(
      sql`lower(${table.abbreviation})`,
    ),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    subcategoryId: uuid("subcategory_id").references(() => subcategories.id, {
      onDelete: "cascade",
    }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
    lastPostAt: timestamp("last_post_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // Redesign columns (nullable until the Phase 8 contract migration).
    boardId: uuid("board_id").references(() => boards.id, {
      onDelete: "cascade",
    }),
    replyCount: integer("reply_count"),
    lastActivityAt: timestamp("last_activity_at"),
  },
  (table) => [
    index("topics_subcategory_idx").on(table.subcategoryId),
    index("topics_category_idx").on(table.categoryId),
    index("topics_author_idx").on(table.authorId),
    index("topics_board_idx").on(table.boardId),
    // Keyset traversal order for board topic lists (plan section 4.2).
    index("topics_board_keyset_idx").on(
      table.boardId,
      table.isPinned.desc(),
      table.lastActivityAt.desc(),
      table.id.desc(),
    ),
    // Null-compatible: legacy rows keep reply_count NULL until Phase 8.
    check("topics_reply_count_check", sql`${table.replyCount} >= 0`),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    editedAt: timestamp("edited_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // Redesign columns (nullable until the Phase 8 contract migration).
    kind: postKind("kind"),
    quoteSnapshot: jsonb("quote_snapshot"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("posts_topic_idx").on(table.topicId),
    index("posts_author_idx").on(table.authorId),
    // At most one opening post per topic (plan section 4.3).
    uniqueIndex("posts_topic_opening_unique_idx")
      .on(table.topicId)
      .where(sql`${table.kind} = 'opening'`),
    // Keyset traversal for replies; the opening post never consumes
    // reply-page capacity.
    index("posts_reply_keyset_idx")
      .on(table.topicId, table.createdAt.asc(), table.id.asc())
      .where(sql`${table.kind} = 'reply'`),
    // Quote snapshots only ever appear on replies.
    check(
      "posts_quote_reply_only_check",
      sql`${table.quoteSnapshot} IS NULL OR ${table.kind} = 'reply'`,
    ),
    // Null-compatible until Phase 8: deleted_at may only be set on deleted
    // posts; legacy soft-deleted rows may still have a NULL deleted_at.
    check(
      "posts_deleted_at_consistency_check",
      sql`${table.deletedAt} IS NULL OR ${table.isDeleted}`,
    ),
  ],
);
