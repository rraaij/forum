import { Hono } from "hono";
import { isDomainError } from "../modules/shared/errors";
import type { TopicNotifications } from "../modules/topic-notifications/types";
import { respondWithDomainError } from "../transport/error-envelope";
import {
  notificationListQuerySchema,
  notificationParamsSchema,
  topicSubscriptionParamsSchema,
} from "../transport/schemas/topic-notifications";
import { requireActor, transportValidator } from "../transport/validator";
import type { AppEnv } from "../types";

async function mapDomainError<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (isDomainError(error)) return error;
    throw error;
  }
}

export function createTopicSubscriptionRoutes(module: TopicNotifications) {
  return new Hono<AppEnv>()
    .get(
      "/:topicId/subscription",
      requireActor,
      transportValidator("param", topicSubscriptionParamsSchema),
      async (c) => {
        // biome-ignore lint/style/noNonNullAssertion: requireActor ran
        const user = c.get("user")!;
        const result = await mapDomainError(() =>
          module.getSubscription(user.id, c.req.valid("param").topicId),
        );
        return isDomainError(result)
          ? respondWithDomainError(c, result)
          : c.json(result);
      },
    )
    .put(
      "/:topicId/subscription",
      requireActor,
      transportValidator("param", topicSubscriptionParamsSchema),
      async (c) => {
        // biome-ignore lint/style/noNonNullAssertion: requireActor ran
        const user = c.get("user")!;
        const result = await mapDomainError(() =>
          module.setSubscription(user.id, c.req.valid("param").topicId, true),
        );
        return isDomainError(result)
          ? respondWithDomainError(c, result)
          : c.json(result);
      },
    )
    .delete(
      "/:topicId/subscription",
      requireActor,
      transportValidator("param", topicSubscriptionParamsSchema),
      async (c) => {
        // biome-ignore lint/style/noNonNullAssertion: requireActor ran
        const user = c.get("user")!;
        const result = await mapDomainError(() =>
          module.setSubscription(user.id, c.req.valid("param").topicId, false),
        );
        return isDomainError(result)
          ? respondWithDomainError(c, result)
          : c.json(result);
      },
    );
}

export function createNotificationRoutes(module: TopicNotifications) {
  return new Hono<AppEnv>()
    .get(
      "/",
      requireActor,
      transportValidator("query", notificationListQuerySchema),
      async (c) => {
        // biome-ignore lint/style/noNonNullAssertion: requireActor ran
        const user = c.get("user")!;
        const query = c.req.valid("query");
        try {
          return c.json(
            await module.listForUser(user.id, {
              cursor: query.cursor,
              limit: query.limit,
            }),
          );
        } catch (error) {
          if (isDomainError(error)) return respondWithDomainError(c, error);
          throw error;
        }
      },
    )
    .get("/unread-count", requireActor, async (c) => {
      // biome-ignore lint/style/noNonNullAssertion: requireActor ran
      const user = c.get("user")!;
      return c.json(await module.unreadCount(user.id));
    })
    .put(
      "/:notificationId/read",
      requireActor,
      transportValidator("param", notificationParamsSchema),
      async (c) => {
        // biome-ignore lint/style/noNonNullAssertion: requireActor ran
        const user = c.get("user")!;
        try {
          await module.markRead(user.id, c.req.valid("param").notificationId);
          return c.body(null, 204);
        } catch (error) {
          if (isDomainError(error)) return respondWithDomainError(c, error);
          throw error;
        }
      },
    );
}
