import {
  boards,
  notifications,
  posts,
  topicSubscriptions,
  topics,
  users,
} from "@forum/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../db";
import type { HierarchyBoardRow } from "../shared/board-hierarchy";

export interface NotificationCursor {
  createdAt: Date;
  id: string;
}

export interface NotificationRow {
  id: string;
  postId: string;
  createdAt: Date;
  readAt: Date | null;
  actorId: string;
  actorName: string | null;
  actorDisplayName: string | null;
  actorImage: string | null;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  boardId: string;
}

export interface TopicNotificationTx {
  lockTopic(topicId: string): Promise<boolean>;
  hasSubscription(userId: string, topicId: string): Promise<boolean>;
  addSubscription(userId: string, topicId: string, now: Date): Promise<void>;
  removeSubscription(userId: string, topicId: string): Promise<void>;
  allBoards(): Promise<HierarchyBoardRow[]>;
  notificationPage(
    userId: string,
    cursor: NotificationCursor | null,
    limitPlusOne: number,
  ): Promise<NotificationRow[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string, now: Date): Promise<boolean>;
}

export interface TopicNotificationStore {
  transaction<T>(run: (tx: TopicNotificationTx) => Promise<T>): Promise<T>;
}

export function createTopicNotificationStore(
  db: Database,
): TopicNotificationStore {
  return {
    transaction(run) {
      return db.transaction(async (tx) => {
        const ops: TopicNotificationTx = {
          async lockTopic(topicId) {
            const rows = await tx
              .select({ id: topics.id })
              .from(topics)
              .where(eq(topics.id, topicId))
              .limit(1)
              .for("update");
            return rows.length > 0;
          },

          async hasSubscription(userId, topicId) {
            const rows = await tx
              .select({ topicId: topicSubscriptions.topicId })
              .from(topicSubscriptions)
              .where(
                and(
                  eq(topicSubscriptions.userId, userId),
                  eq(topicSubscriptions.topicId, topicId),
                ),
              )
              .limit(1);
            return rows.length > 0;
          },

          async addSubscription(userId, topicId, now) {
            await tx
              .insert(topicSubscriptions)
              .values({ userId, topicId, createdAt: now })
              .onConflictDoNothing();
          },

          async removeSubscription(userId, topicId) {
            await tx
              .delete(topicSubscriptions)
              .where(
                and(
                  eq(topicSubscriptions.userId, userId),
                  eq(topicSubscriptions.topicId, topicId),
                ),
              );
          },

          async allBoards() {
            return tx
              .select({
                id: boards.id,
                parentId: boards.parentId,
                name: boards.name,
                slug: boards.slug,
                sortOrder: boards.sortOrder,
              })
              .from(boards);
          },

          async notificationPage(userId, cursor, limitPlusOne) {
            const seek = cursor
              ? sql`(${notifications.createdAt}, ${notifications.id}) < (${cursor.createdAt.toISOString()}::timestamp, ${cursor.id}::uuid)`
              : undefined;
            return tx
              .select({
                id: notifications.id,
                postId: notifications.postId,
                createdAt: notifications.createdAt,
                readAt: notifications.readAt,
                actorId: posts.authorId,
                actorName: users.name,
                actorDisplayName: users.displayName,
                actorImage: users.image,
                topicId: topics.id,
                topicTitle: topics.title,
                topicSlug: topics.slug,
                boardId: topics.boardId,
              })
              .from(notifications)
              .innerJoin(posts, eq(notifications.postId, posts.id))
              .innerJoin(topics, eq(posts.topicId, topics.id))
              .innerJoin(users, eq(posts.authorId, users.id))
              .where(and(eq(notifications.recipientId, userId), seek))
              .orderBy(desc(notifications.createdAt), desc(notifications.id))
              .limit(limitPlusOne);
          },

          async unreadCount(userId) {
            const [row] = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(notifications)
              .where(
                and(
                  eq(notifications.recipientId, userId),
                  isNull(notifications.readAt),
                ),
              );
            return row?.count ?? 0;
          },

          async markRead(userId, notificationId, now) {
            const rows = await tx
              .update(notifications)
              .set({
                readAt: sql`coalesce(${notifications.readAt}, ${now.toISOString()}::timestamp)`,
              })
              .where(
                and(
                  eq(notifications.id, notificationId),
                  eq(notifications.recipientId, userId),
                ),
              )
              .returning({ id: notifications.id });
            return rows.length > 0;
          },
        };
        return run(ops);
      });
    },
  };
}
