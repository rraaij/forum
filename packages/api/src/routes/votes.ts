import { votes } from "@forum/db/schema";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db";
import { requireUser } from "../middleware/require-user";
import type { InteractionWrite } from "../modules/interaction-write/types";
import type { AppEnv } from "../types";
import {
  legacyJsonBodyLimit,
  legacyValidator,
  uuid,
} from "../validation/legacy";

/*
 * Vote routes. The WRITE now goes through the interaction-write module so
 * it takes the shared forum-content advisory lock (plan section 5.6);
 * add/switch/remove semantics and the legacy error shape are unchanged.
 */
export function createVoteRoutes(interactions: InteractionWrite) {
  return (
    new Hono<AppEnv>()
      // GET /api/votes?postId=... — get vote score for a post
      .get("/", async (c) => {
        const db = getDb();
        const postId = c.req.query("postId");

        if (!postId) {
          return c.json({ error: "postId is required" }, 400);
        }

        const [result] = await db
          .select({
            score: sql<number>`coalesce(sum(${votes.value}), 0)::int`,
          })
          .from(votes)
          .where(eq(votes.postId, postId));

        return c.json({ score: result?.score ?? 0 });
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
