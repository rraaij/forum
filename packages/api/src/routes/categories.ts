import { categories, subcategories } from "@forum/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";

const categoriesRoutes = new Hono<AppEnv>();

// GET /api/categories — list all categories with subcategories
categoriesRoutes.get("/", async (c) => {
  const db = getDb();

  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(categories.sortOrder);

  const allSubcategories = await db
    .select()
    .from(subcategories)
    .orderBy(subcategories.sortOrder);

  const result = allCategories.map((cat) => ({
    ...cat,
    subcategories: allSubcategories.filter((sub) => sub.categoryId === cat.id),
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

  const subs = await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.categoryId, category.id))
    .orderBy(subcategories.sortOrder);

  return c.json({ ...category, subcategories: subs });
});

export { categoriesRoutes };
