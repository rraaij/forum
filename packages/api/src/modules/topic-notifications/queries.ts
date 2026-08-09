import { z } from "zod";
import { buildBoardHierarchy } from "../shared/board-hierarchy";
import { validationError } from "../shared/errors";
import { normalizePageLimit } from "../shared/pagination";
import { notificationNotFound, subscriptionTopicNotFound } from "./errors";
import type { NotificationCursor, TopicNotificationStore } from "./repository";
import type { TopicNotifications } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cursorSchema = z
  .object({
    version: z.literal(1),
    createdAt: z.iso.datetime(),
    id: z.uuid(),
  })
  .strict();

function assertUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw validationError("INVALID_ID", `${field} must be a valid ID`, field);
  }
}

function decodeCursor(value: string): NotificationCursor {
  try {
    const parsed = cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw validationError(
      "INVALID_CURSOR",
      "Invalid notification cursor",
      "cursor",
    );
  }
}

function encodeCursor(cursor: NotificationCursor): string {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
    "utf8",
  ).toString("base64url");
}

export function createTopicNotifications(
  store: TopicNotificationStore,
): TopicNotifications {
  return {
    async getSubscription(userId, topicId) {
      assertUuid(topicId, "topicId");
      return store.transaction(async (tx) => {
        if (!(await tx.lockTopic(topicId))) throw subscriptionTopicNotFound();
        return { subscribed: await tx.hasSubscription(userId, topicId) };
      });
    },

    async setSubscription(userId, topicId, subscribed) {
      assertUuid(topicId, "topicId");
      const now = new Date();
      return store.transaction(async (tx) => {
        /*
         * The same topic lock orders subscribe/unsubscribe against reply
         * fan-out: whichever transaction owns the lock first defines whether
         * that reply creates a notification.
         */
        if (!(await tx.lockTopic(topicId))) throw subscriptionTopicNotFound();
        if (subscribed) await tx.addSubscription(userId, topicId, now);
        else await tx.removeSubscription(userId, topicId);
        return { subscribed };
      });
    },

    async listForUser(userId, request) {
      const limit = normalizePageLimit(request.limit);
      const cursor = request.cursor ? decodeCursor(request.cursor) : null;
      return store.transaction(async (tx) => {
        const hierarchy = buildBoardHierarchy(await tx.allBoards());
        const rows = await tx.notificationPage(userId, cursor, limit + 1);
        const pageRows = rows.slice(0, limit);
        const items = pageRows.flatMap((row) => {
          const routeParams = hierarchy.topicRouteParams(
            row.boardId,
            row.topicSlug,
          );
          return routeParams
            ? [
                {
                  id: row.id,
                  postId: row.postId,
                  createdAt: row.createdAt.toISOString(),
                  readAt: row.readAt?.toISOString() ?? null,
                  actor: {
                    id: row.actorId,
                    name: row.actorName,
                    displayName: row.actorDisplayName,
                    image: row.actorImage,
                  },
                  topic: { id: row.topicId, title: row.topicTitle },
                  routeParams,
                },
              ]
            : [];
        });
        const last = pageRows.at(-1);
        return {
          items,
          nextCursor:
            rows.length > limit && last
              ? encodeCursor({ createdAt: last.createdAt, id: last.id })
              : null,
        };
      });
    },

    async unreadCount(userId) {
      return store.transaction(async (tx) => ({
        count: await tx.unreadCount(userId),
      }));
    },

    async markRead(userId, notificationId) {
      assertUuid(notificationId, "notificationId");
      await store.transaction(async (tx) => {
        if (!(await tx.markRead(userId, notificationId, new Date()))) {
          throw notificationNotFound();
        }
      });
    },
  };
}
