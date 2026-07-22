import { categories, subcategories, topics } from "@forum/db/schema";
import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";

const categoriesRoutes = new Hono<AppEnv>();

interface TopicCountMaps {
  categories: Map<string, number>;
  subcategories: Map<string, number>;
}

async function getTopicCountMaps(): Promise<TopicCountMaps> {
  const db = getDb();

  /*
   * Topics can belong directly to either a category or a subcategory. Grouping
   * by both nullable parent columns gives us all direct topic counts in one
   * database query instead of issuing a separate query for every forum board.
   */
  const rows = await db
    .select({
      categoryId: topics.categoryId,
      subcategoryId: topics.subcategoryId,
      topicCount: count(),
    })
    .from(topics)
    .groupBy(topics.categoryId, topics.subcategoryId);

  const categoryCounts = new Map<string, number>();
  const subcategoryCounts = new Map<string, number>();

  for (const row of rows) {
    // The API enforces exactly one parent when a topic is created, but handle
    // both fields defensively in case older database rows predate that rule.
    if (row.categoryId) {
      categoryCounts.set(row.categoryId, Number(row.topicCount));
    }
    if (row.subcategoryId) {
      subcategoryCounts.set(row.subcategoryId, Number(row.topicCount));
    }
  }

  return {
    categories: categoryCounts,
    subcategories: subcategoryCounts,
  };
}

// GET /api/categories — list all categories with subcategories
categoriesRoutes.get("/", async (c) => {
  const db = getDb();

  // These reads are independent, so run them together to keep the root forum
  // page loader fast even when the number of boards grows.
  const [allCategories, allSubcategories, topicCounts] = await Promise.all([
    db.select().from(categories).orderBy(categories.sortOrder),
    db.select().from(subcategories).orderBy(subcategories.sortOrder),
    getTopicCountMaps(),
  ]);

  const result = allCategories.map((cat) => ({
    ...cat,
    topicCount: topicCounts.categories.get(cat.id) ?? 0,
    subcategories: allSubcategories
      .filter((sub) => sub.categoryId === cat.id)
      .map((sub) => ({
        ...sub,
        topicCount: topicCounts.subcategories.get(sub.id) ?? 0,
      })),
  }));

  return c.json(result);
});

// GET /api/categories/:slug — single category with subcategories
categoriesRoutes.get("/:slug", async (c) => {
  const db = getDb();
  const slug = c.req.param("slug");

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (!category) {
    return c.json({ error: "Category not found" }, 404);
  }

  const [subs, topicCounts] = await Promise.all([
    db
      .select()
      .from(subcategories)
      .where(eq(subcategories.categoryId, category.id))
      .orderBy(subcategories.sortOrder),
    getTopicCountMaps(),
  ]);

  return c.json({
    ...category,
    topicCount: topicCounts.categories.get(category.id) ?? 0,
    subcategories: subs.map((sub) => ({
      ...sub,
      topicCount: topicCounts.subcategories.get(sub.id) ?? 0,
    })),
  });
});

export { categoriesRoutes };
