import { z } from "zod";
import { cursorSchema, pageLimitSchema, uuidSchema } from "./shared";

export const topicSubscriptionParamsSchema = z.object({
  topicId: uuidSchema,
});

export const notificationListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: pageLimitSchema.optional(),
});

export const notificationParamsSchema = z.object({
  notificationId: uuidSchema,
});
