import {
  categories,
  posts,
  subcategories,
  topics,
  users,
} from "@forum/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db";
import { requireUser } from "../middleware/require-user";
import type { AppEnv } from "../types";
import {
  legacyJsonBodyLimit,
  legacyValidator,
  postContent,
  topicTitle,
  uuid,
} from "../validation/legacy";

const createTopicSchema = z
  .object({
    categoryId: uuid("categoryId").optional(),
    subcategoryId: uuid("subcategoryId").optional(),
    title: topicTitle,
    content: postContent,
  })
  .superRefine((body, ctx) => {
    if (!body.categoryId && !body.subcategoryId) {
      ctx.addIssue({
        code: "custom",
        message: "categoryId or subcategoryId is required",
      });
    }
    if (body.categoryId && body.subcategoryId) {
      ctx.addIssue({
        code: "custom",
        message: "Provide categoryId or subcategoryId, not both",
      });
    }
  });

// Registrations are chained so the route schema reaches AppType.
const topicsRoutes = new Hono<AppEnv>()
  // GET /api/topics?subcategoryId=... or ?categoryId=... — list topics
  .get("/", async (c) => {
    const db = getDb();
    const subcategoryId = c.req.query("subcategoryId");
    const categoryId = c.req.query("categoryId");

    if (!subcategoryId && !categoryId) {
      return c.json({ error: "subcategoryId or categoryId is required" }, 400);
    }

    if (subcategoryId && categoryId) {
      return c.json(
        { error: "Provide subcategoryId or categoryId, not both" },
        400,
      );
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
        // Topic lists need the same live user avatar as individual post rows.
        authorImage: users.image,
      })
      .from(topics)
      .leftJoin(users, eq(topics.authorId, users.id))
      .where(
        subcategoryId
          ? eq(topics.subcategoryId, subcategoryId)
          : // biome-ignore lint/style/noNonNullAssertion: guarded by preceding !subcategoryId && !categoryId check
            eq(topics.categoryId, categoryId!),
      )
      .orderBy(desc(topics.isPinned), desc(topics.lastPostAt));

    return c.json(result);
  })
  // GET /api/topics/:id — single topic with posts
  .get("/:id", async (c) => {
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
  })
  // POST /api/topics — create topic (auth required)
  .post(
    "/",
    requireUser,
    legacyJsonBodyLimit(),
    legacyValidator("json", createTopicSchema),
    async (c) => {
      // requireUser middleware guarantees the actor exists.
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const db = getDb();
      const body = c.req.valid("json");

      // Verify parent exists
      if (body.subcategoryId) {
        const [sub] = await db
          .select()
          .from(subcategories)
          .where(eq(subcategories.id, body.subcategoryId))
          .limit(1);
        if (!sub) return c.json({ error: "Subcategory not found" }, 404);
      } else {
        const [cat] = await db
          .select()
          .from(categories)
          // biome-ignore lint/style/noNonNullAssertion: guarded by preceding !body.subcategoryId check
          .where(eq(categories.id, body.categoryId!))
          .limit(1);
        if (!cat) return c.json({ error: "Category not found" }, 404);
      }

      const slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const [topic] = await db
        .insert(topics)
        .values({
          categoryId: body.categoryId ?? null,
          subcategoryId: body.subcategoryId ?? null,
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
    },
  );

export { topicsRoutes };
