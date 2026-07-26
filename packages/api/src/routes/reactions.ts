import { Hono } from "hono";
import { z } from "zod";
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
 * Reaction routes. Reads and writes both go through the interaction module,
 * so this adapter holds no database access: it validates, extracts the
 * actor, invokes, and maps to HTTP. Reactions were not redesigned, so the
 * contract — including the plain { error: string } failure shape — is
 * unchanged (plan section 5.6).
 */
export function createReactionRoutes(interactions: InteractionWrite) {
  return (
    new Hono<AppEnv>()
      // GET /api/reactions?postId=... — get reactions for a post
      .get("/", async (c) => {
        const postId = c.req.query("postId");
        if (!postId) {
          return c.json({ error: "postId is required" }, 400);
        }
        return c.json(await interactions.getReactions(postId));
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
