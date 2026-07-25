import { categories, posts, subcategories, topics } from "@forum/db/schema";
import { desc, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";

/*
 * LEGACY profile activity route. Everything else on /api/profile moved to
 * the ProfileEdit module in Phase 5's successor phase; this endpoint still
 * reads the old categories/subcategories tables and is replaced by the
 * ProfileActivity module in Phase 7.
 */
const profileRoutes = new Hono<AppEnv>().get("/activity", async (c) => {
  const sessionUser = c.get("user");
  if (!sessionUser) return c.json({ error: "Unauthorized" }, 401);

  const rows = await getDb()
    .select({
      postId: posts.id,
      postContent: posts.content,
      postCreatedAt: posts.createdAt,
      postDeleted: posts.isDeleted,
      topicId: topics.id,
      topicTitle: topics.title,
      topicSlug: topics.slug,
      topicCreatedAt: topics.createdAt,
      topicAuthorId: topics.authorId,
      categorySlug: categories.slug,
      subcategorySlug: subcategories.slug,
      /*
       * The query is restricted to one author. For a topic that user
       * created, their first post is therefore its opening post.
       */
      authorPostPosition: sql<number>`row_number() over (
        partition by ${topics.id}
        order by ${posts.createdAt}, ${posts.id}
      )`,
    })
    .from(posts)
    .innerJoin(topics, eq(posts.topicId, topics.id))
    .leftJoin(subcategories, eq(topics.subcategoryId, subcategories.id))
    .leftJoin(
      categories,
      or(
        eq(categories.id, topics.categoryId),
        eq(categories.id, subcategories.categoryId),
      ),
    )
    .where(eq(posts.authorId, sessionUser.id))
    .orderBy(desc(posts.createdAt));

  return c.json(
    rows.map((row) => ({
      postId: row.postId,
      postContent: row.postContent,
      postCreatedAt: row.postCreatedAt,
      postDeleted: row.postDeleted,
      topicId: row.topicId,
      topicTitle: row.topicTitle,
      topicSlug: row.topicSlug,
      topicCreatedAt: row.topicCreatedAt,
      categorySlug: row.categorySlug,
      subcategorySlug: row.subcategorySlug,
      isTopicStart:
        row.topicAuthorId === sessionUser.id &&
        Number(row.authorPostPosition) === 1,
    })),
  );
});

export { profileRoutes };
