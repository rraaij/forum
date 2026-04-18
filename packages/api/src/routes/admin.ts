import { categories, subcategories } from "@forum/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import { adminGuard } from "../middleware/admin";
import type { AppEnv } from "../types";

const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("*", adminGuard);

// ── Categories ────────────────────────────────────────────

adminRoutes.post("/categories", async (c) => {
  const db = getDb();
  const body = await c.req.json<{
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }>();

  if (!body.name?.trim() || !body.slug?.trim()) {
    return c.json({ error: "name and slug are required" }, 400);
  }

  const [category] = await db
    .insert(categories)
    .values({
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      icon: body.icon ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return c.json(category, 201);
});

adminRoutes.put("/categories/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    slug?: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
  }>();

  const [updated] = await db
    .update(categories)
    .set(body)
    .where(eq(categories.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

adminRoutes.delete("/categories/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ success: true });
});

// ── Subcategories ─────────────────────────────────────────

adminRoutes.post("/subcategories", async (c) => {
  const db = getDb();
  const body = await c.req.json<{
    categoryId: string;
    parentSubcategoryId?: string;
    name: string;
    slug: string;
    description?: string;
    sortOrder?: number;
  }>();

  if (!body.categoryId || !body.name?.trim() || !body.slug?.trim()) {
    return c.json({ error: "categoryId, name and slug are required" }, 400);
  }

  // Verify category exists
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, body.categoryId))
    .limit(1);

  if (!cat) return c.json({ error: "Category not found" }, 404);

  // Enforce max 1 level of nesting
  if (body.parentSubcategoryId) {
    const [parent] = await db
      .select()
      .from(subcategories)
      .where(eq(subcategories.id, body.parentSubcategoryId))
      .limit(1);

    if (!parent) return c.json({ error: "Parent subcategory not found" }, 404);
    if (parent.parentSubcategoryId) {
      return c.json({ error: "Maximum nesting depth reached" }, 400);
    }
  }

  const [sub] = await db
    .insert(subcategories)
    .values({
      categoryId: body.categoryId,
      parentSubcategoryId: body.parentSubcategoryId ?? null,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return c.json(sub, 201);
});

adminRoutes.put("/subcategories/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    slug?: string;
    description?: string | null;
    sortOrder?: number;
  }>();

  const [updated] = await db
    .update(subcategories)
    .set(body)
    .where(eq(subcategories.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

adminRoutes.delete("/subcategories/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  await db.delete(subcategories).where(eq(subcategories.id, id));
  return c.json({ success: true });
});

export { adminRoutes };
