import { z } from "zod";
import { cursorSchema, pageLimitSchema, uuidSchema } from "./shared";

const queryBoolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const forumSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  boardId: uuidSchema.optional(),
  topicsOnly: queryBoolean.optional(),
  authorId: z.string().trim().min(1).max(255).optional(),
  latestMonth: queryBoolean.optional(),
  sort: z.enum(["newest", "relevance"]).optional(),
  cursor: cursorSchema.optional(),
  limit: pageLimitSchema.optional(),
});
