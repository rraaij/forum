import { reactions } from "@forum/db/schema";
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
  reactionEmoji,
  uuid,
} from "../validation/legacy";

/*
 * Reaction routes. The WRITE now goes through the interaction-write module
 * so it takes the shared forum-content advisory lock (plan section 5.6);
 * the HTTP contract and the legacy { error: string } shape are unchanged.
 * The read stays inline until reactions are redesigned (out of scope).
 */
export function createReactionRoutes(interactions: InteractionWrite) {
  return (
    new Hono<AppEnv>()
      // GET /api/reactions?postId=... — get reactions for a post
      .get("/", async (c) => {
        const db = getDb();
        const postId = c.req.query("postId");

        if (!postId) {
          return c.json({ error: "postId is required" }, 400);
        }

        const result = await db
          .select({
            emoji: reactions.emoji,
            count: sql<number>`count(*)::int`,
          })
          .from(reactions)
          .where(eq(reactions.postId, postId))
          .groupBy(reactions.emoji);

        return c.json(result);
      })
      // POST /api/reactions — toggle reaction (auth required)
      .post(
        "/",
        requireUser,
        legacyJsonBodyLimit(),
        legacyValidator(
          "json",
          z.object({ postId: uuid("postId"), emoji: reactionEmoji }),
        ),
        async (c) => {
          const user = c.get("user");
          if (!user) {
            return c.json({ error: "Unauthorized" }, 401);
          }

          const body = c.req.valid("json");
          const result = await interactions.toggleReaction({
            actorId: user.id,
            postId: body.postId,
            emoji: body.emoji,
          });

          return result.action === "added"
            ? c.json(result, 201)
            : c.json(result);
        },
      )
  );
}
