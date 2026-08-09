import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { posts, topics } from "./forum";

export const notificationKind = pgEnum("notification_kind", ["topic_reply"]);

export const topicSubscriptions = pgTable(
  "topic_subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.topicId] }),
    // Reply fan-out starts with a topic and must never scan by user.
    index("topic_subscriptions_topic_idx").on(table.topicId, table.userId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { precision: 3 }),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notifications_recipient_kind_post_unique_idx").on(
      table.recipientId,
      table.kind,
      table.postId,
    ),
    index("notifications_inbox_keyset_idx").on(
      table.recipientId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("notifications_recipient_unread_idx")
      .on(table.recipientId)
      .where(sql`${table.readAt} IS NULL`),
  ],
);
