import { posts, topics } from "@forum/db/schema";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";

const postsRoutes = new Hono<AppEnv>();

// POST /api/posts — create a reply (auth required)
postsRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const body = await c.req.json<{ topicId: string; content: string }>();

  // Verify topic exists and is not locked
  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, body.topicId))
    .limit(1);

  if (!topic) {
    return c.json({ error: "Topic not found" }, 404);
  }

  if (topic.isLocked) {
    return c.json({ error: "Topic is locked" }, 403);
  }

  const [post] = await db
    .insert(posts)
    .values({
      topicId: body.topicId,
      authorId: user.id,
      content: body.content,
    })
    .returning();

  // Update topic counters
  await db
    .update(topics)
    .set({
      postCount: sql`${topics.postCount} + 1`,
      lastPostAt: new Date(),
    })
    .where(eq(topics.id, body.topicId));

  return c.json(post, 201);
});

// PUT /api/posts/:id — edit post (author only)
postsRoutes.put("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{ content: string }>();

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (post.authorId !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const [updated] = await db
    .update(posts)
    .set({ content: body.content, editedAt: new Date() })
    .where(eq(posts.id, id))
    .returning();

  return c.json(updated);
});

// DELETE /api/posts/:id — soft delete (author or admin)
postsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const id = c.req.param("id");

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (post.authorId !== user.id && user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, id));

  return c.json({ success: true });
});

export { postsRoutes };
