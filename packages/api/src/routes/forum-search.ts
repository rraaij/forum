import { Hono } from "hono";
import type { ForumSearch } from "../modules/forum-search/types";
import { isDomainError } from "../modules/shared/errors";
import { respondWithDomainError } from "../transport/error-envelope";
import { forumSearchQuerySchema } from "../transport/schemas";
import { transportValidator } from "../transport/validator";
import type { AppEnv } from "../types";

export function createForumSearchRoutes(search: ForumSearch) {
  return new Hono<AppEnv>().get(
    "/",
    transportValidator("query", forumSearchQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      try {
        return c.json(
          await search.search({
            ...query,
            viewer: { isAuthenticated: Boolean(c.get("user")) },
          }),
        );
      } catch (error) {
        if (isDomainError(error)) return respondWithDomainError(c, error);
        throw error;
      }
    },
  );
}
