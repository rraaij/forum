import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

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
  },
  (table) => [
    index("topics_subcategory_idx").on(table.subcategoryId),
    index("topics_category_idx").on(table.categoryId),
    index("topics_author_idx").on(table.authorId),
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
  },
  (table) => [
    index("posts_topic_idx").on(table.topicId),
    index("posts_author_idx").on(table.authorId),
  ],
);
