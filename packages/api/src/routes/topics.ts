import { posts, subcategories, topics, users } from "@forum/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";

const topicsRoutes = new Hono<AppEnv>();

// GET /api/topics?subcategoryId=... — list topics in subcategory
topicsRoutes.get("/", async (c) => {
  const db = getDb();
  const subcategoryId = c.req.query("subcategoryId");

  if (!subcategoryId) {
    return c.json({ error: "subcategoryId is required" }, 400);
  }

  const result = await db
    .select({
      id: topics.id,
      title: topics.title,
      slug: topics.slug,
      isPinned: topics.isPinned,
      isLocked: topics.isLocked,
      viewCount: topics.viewCount,
      postCount: topics.postCount,
      lastPostAt: topics.lastPostAt,
      createdAt: topics.createdAt,
      authorId: topics.authorId,
      authorName: users.name,
    })
    .from(topics)
    .leftJoin(users, eq(topics.authorId, users.id))
    .where(eq(topics.subcategoryId, subcategoryId))
    .orderBy(desc(topics.isPinned), desc(topics.lastPostAt));

  return c.json(result);
});

// GET /api/topics/:id — single topic with posts
topicsRoutes.get("/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");

  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, id))
    .limit(1);

  if (!topic) {
    return c.json({ error: "Topic not found" }, 404);
  }

  // Increment view count
  await db
    .update(topics)
    .set({ viewCount: sql`${topics.viewCount} + 1` })
    .where(eq(topics.id, id));

  const topicPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      isDeleted: posts.isDeleted,
      editedAt: posts.editedAt,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.topicId, id))
    .orderBy(posts.createdAt);

  return c.json({ ...topic, posts: topicPosts });
});

// POST /api/topics — create topic (auth required)
topicsRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const body = await c.req.json<{
    subcategoryId: string;
    title: string;
    content: string;
  }>();

  // Verify subcategory exists
  const [sub] = await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.id, body.subcategoryId))
    .limit(1);

  if (!sub) {
    return c.json({ error: "Subcategory not found" }, 404);
  }

  const slug = body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create topic + first post in sequence
  const [topic] = await db
    .insert(topics)
    .values({
      subcategoryId: body.subcategoryId,
      authorId: user.id,
      title: body.title,
      slug,
      postCount: 1,
      lastPostAt: new Date(),
    })
    .returning();

  await db.insert(posts).values({
    topicId: topic.id,
    authorId: user.id,
    content: body.content,
  });

  return c.json(topic, 201);
});

export { topicsRoutes };
