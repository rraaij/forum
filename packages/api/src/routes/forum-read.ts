/*
 * Read adapters for the forum read model (refactor plan section 6). Pure
 * adapters: runtime validation, module invocation, HTTP mapping. Queries
 * never mutate state — topic views moved to an explicit command.
 */

import { Hono } from "hono";
import type { ForumReadModel } from "../modules/forum-read/types";
import { isDomainError } from "../modules/shared/errors";
import { respondWithDomainError } from "../transport/error-envelope";
import {
  boardPageParamsSchema,
  categoryPageParamsSchema,
  replyPageRequestQuerySchema,
  topicPageParamsSchema,
  topicPageRequestQuerySchema,
} from "../transport/schemas";
import { transportValidator } from "../transport/validator";
import type { AppEnv } from "../types";

export function createForumReadRoutes(readModel: ForumReadModel) {
  const viewer = (c: { get: (key: "user") => unknown }) => ({
    isAuthenticated: Boolean(c.get("user")),
  });
  return new Hono<AppEnv>()
    .get("/", async (c) => {
      return c.json(await readModel.getForumIndex({ viewer: viewer(c) }));
    })
    .get(
      "/categories/:categorySlug",
      transportValidator("param", categoryPageParamsSchema),
      transportValidator("query", topicPageRequestQuerySchema),
      async (c) => {
        const query = c.req.valid("query");
        try {
          const page = await readModel.getCategoryPage({
            categorySlug: c.req.valid("param").categorySlug,
            topics: { cursor: query.topicCursor, limit: query.topicLimit },
            viewer: viewer(c),
          });
          return c.json(page);
        } catch (error) {
          if (isDomainError(error)) return respondWithDomainError(c, error);
          throw error;
        }
      },
    )
    .get(
      "/categories/:categorySlug/boards/:boardId",
      transportValidator("param", boardPageParamsSchema),
      transportValidator("query", topicPageRequestQuerySchema),
      async (c) => {
        const params = c.req.valid("param");
        const query = c.req.valid("query");
        try {
          const page = await readModel.getBoardPage({
            categorySlug: params.categorySlug,
            boardId: params.boardId,
            topics: { cursor: query.topicCursor, limit: query.topicLimit },
            viewer: viewer(c),
          });
          return c.json(page);
        } catch (error) {
          if (isDomainError(error)) return respondWithDomainError(c, error);
          throw error;
        }
      },
    )
    .get(
      "/topics/:topicSlug",
      transportValidator("param", topicPageParamsSchema),
      transportValidator("query", replyPageRequestQuerySchema),
      async (c) => {
        const query = c.req.valid("query");
        try {
          const page = await readModel.getTopicPage({
            topicSlug: c.req.valid("param").topicSlug,
            replies: {
              cursor: query.replyCursor,
              limit: query.replyLimit,
              targetReplyId: query.targetReplyId,
            },
            viewer: viewer(c),
          });
          return c.json(page);
        } catch (error) {
          if (isDomainError(error)) return respondWithDomainError(c, error);
          throw error;
        }
      },
    );
}
