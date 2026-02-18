import { votes } from "@forum/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";

const votesRoutes = new Hono<AppEnv>();

// GET /api/votes?postId=... — get vote score for a post
votesRoutes.get("/", async (c) => {
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
});

// POST /api/votes — toggle vote (auth required)
votesRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const body = await c.req.json<{ postId: string; value: number }>();

  if (body.value !== 1 && body.value !== -1) {
    return c.json({ error: "value must be 1 or -1" }, 400);
  }

  // Check existing vote
  const [existing] = await db
    .select()
    .from(votes)
    .where(and(eq(votes.postId, body.postId), eq(votes.userId, user.id)))
    .limit(1);

  if (existing) {
    if (existing.value === body.value) {
      // Same vote → remove (un-vote)
      await db.delete(votes).where(eq(votes.id, existing.id));
      return c.json({ action: "removed" });
    }
    // Different vote → switch
    await db
      .update(votes)
      .set({ value: body.value })
      .where(eq(votes.id, existing.id));
    return c.json({ action: "switched" });
  }

  // New vote
  const [vote] = await db
    .insert(votes)
    .values({
      postId: body.postId,
      userId: user.id,
      value: body.value,
    })
    .returning();

  return c.json({ action: "added", vote }, 201);
});

export { votesRoutes };
