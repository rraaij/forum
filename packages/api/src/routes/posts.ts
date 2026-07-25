import { posts, topics } from "@forum/db/schema";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db";
import { requireUser } from "../middleware/require-user";
import type { AppEnv } from "../types";
import {
  legacyJsonBodyLimit,
  legacyValidator,
  postContent,
  uuid,
} from "../validation/legacy";

const postsRoutes = new Hono<AppEnv>();

const postIdParam = z.object({ id: uuid("id") });

// POST /api/posts — create a reply (auth required)
postsRoutes.post(
  "/",
  requireUser,
  legacyJsonBodyLimit(),
  legacyValidator(
    "json",
    z.object({ topicId: uuid("topicId"), content: postContent }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = getDb();
    const body = c.req.valid("json");

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
  },
);

// PUT /api/posts/:id — edit post (author only)
postsRoutes.put(
  "/:id",
  requireUser,
  legacyJsonBodyLimit(),
  legacyValidator("param", postIdParam),
  legacyValidator("json", z.object({ content: postContent })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = getDb();
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

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
  },
);

// DELETE /api/posts/:id — soft delete (author or admin)
postsRoutes.delete(
  "/:id",
  requireUser,
  legacyValidator("param", postIdParam),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = getDb();
    const { id } = c.req.valid("param");

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    if (post.authorId !== user.id && user.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, id));

    return c.json({ success: true });
  },
);

export { postsRoutes };
