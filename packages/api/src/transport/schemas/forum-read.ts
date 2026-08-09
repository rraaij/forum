import { z } from "zod";
import {
  cursorSchema,
  pageLimitSchema,
  slugSegmentSchema,
  uuidSchema,
} from "./shared";

// GET /api/forum/categories/:categorySlug
export const categoryPageParamsSchema = z.object({
  categorySlug: slugSegmentSchema,
});

// GET /api/forum/categories/:categorySlug/boards/:boardId
export const boardPageParamsSchema = z.object({
  categorySlug: slugSegmentSchema,
  boardId: uuidSchema,
});

// Topic-list pagination for category and board pages.
export const topicPageRequestQuerySchema = z.object({
  topicCursor: cursorSchema.optional(),
  topicLimit: pageLimitSchema.optional(),
});

// GET /api/forum/topics/:topicSlug
export const topicPageParamsSchema = z.object({
  topicSlug: slugSegmentSchema,
});

export const replyPageRequestQuerySchema = z
  .object({
    replyCursor: cursorSchema.optional(),
    replyLimit: pageLimitSchema.optional(),
    targetReplyId: uuidSchema.optional(),
  })
  .refine((query) => !(query.replyCursor && query.targetReplyId), {
    message: "replyCursor and targetReplyId cannot be combined",
    path: ["targetReplyId"],
  });
