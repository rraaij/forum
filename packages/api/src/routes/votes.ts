import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/require-user";
import type { InteractionWrite } from "../modules/interaction-write/types";
import type { AppEnv } from "../types";
import {
  legacyJsonBodyLimit,
  legacyValidator,
  uuid,
} from "../validation/legacy";

/*
 * Vote routes. Reads and writes both go through the interaction module, so
 * this adapter holds no database access. Votes were not redesigned:
 * add/switch/remove semantics and the plain error shape are unchanged
 * (plan section 5.6).
 */
export function createVoteRoutes(interactions: InteractionWrite) {
  return (
    new Hono<AppEnv>()
      // GET /api/votes?postId=... — get vote score for a post
      .get("/", async (c) => {
        const postId = c.req.query("postId");
        if (!postId) {
          return c.json({ error: "postId is required" }, 400);
        }
        return c.json(await interactions.getVoteScore(postId));
      })
      // POST /api/votes — toggle vote (auth required)
      .post(
        "/",
        requireUser,
        legacyJsonBodyLimit(),
        legacyValidator(
          "json",
          z.object({
            postId: uuid("postId"),
            value: z
              .number({ message: "value must be 1 or -1" })
              .refine(
                (value) => value === 1 || value === -1,
                "value must be 1 or -1",
              ),
          }),
        ),
        async (c) => {
          const user = c.get("user");
          if (!user) {
            return c.json({ error: "Unauthorized" }, 401);
          }

          const body = c.req.valid("json");
          const result = await interactions.applyVote({
            actorId: user.id,
            postId: body.postId,
            value: body.value as 1 | -1,
          });

          return result.action === "added"
            ? c.json(result, 201)
            : c.json(result);
        },
      )
  );
}
