import { reactions } from "@forum/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";

const reactionsRoutes = new Hono<AppEnv>();

// GET /api/reactions?postId=... — get reactions for a post
reactionsRoutes.get("/", async (c) => {
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
});

// POST /api/reactions — toggle reaction (auth required)
reactionsRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const body = await c.req.json<{ postId: string; emoji: string }>();

  // Check if reaction already exists
  const [existing] = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.postId, body.postId),
        eq(reactions.userId, user.id),
        eq(reactions.emoji, body.emoji),
      ),
    )
    .limit(1);

  if (existing) {
    // Remove existing reaction (toggle off)
    await db.delete(reactions).where(eq(reactions.id, existing.id));
    return c.json({ action: "removed" });
  }

  // Add new reaction
  const [reaction] = await db
    .insert(reactions)
    .values({
      postId: body.postId,
      userId: user.id,
      emoji: body.emoji,
    })
    .returning();

  return c.json({ action: "added", reaction }, 201);
});

export { reactionsRoutes };
