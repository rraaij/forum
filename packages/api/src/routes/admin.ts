import { categories, subcategories } from "@forum/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import { adminGuard } from "../middleware/admin";
import type { AppEnv } from "../types";

const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("*", adminGuard);

type IdentifierValues = {
  name?: string;
  slug?: string;
  abbreviation?: string;
};

function isUniqueViolation(error: unknown): boolean {
  /*
   * Postgres errors can be wrapped by the driver. Walk the cause chain so a
   * database race still becomes a useful 409 instead of a generic 500.
   */
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

async function findCategoryIdentifierConflict(
  values: IdentifierValues,
  excludeId?: string,
) {
  const db = getDb();
  const checks = [
    { field: "name", column: categories.name, value: values.name },
    { field: "slug", column: categories.slug, value: values.slug },
    {
      field: "abbreviation",
      column: categories.abbreviation,
      value: values.abbreviation,
    },
  ] as const;

  for (const check of checks) {
    if (!check.value) continue;
    const sameValue = sql`lower(${check.column}) = lower(${check.value})`;
    const [match] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        excludeId ? and(sameValue, ne(categories.id, excludeId)) : sameValue,
      )
      .limit(1);
    if (match) return check.field;
  }

  const subcategoryChecks = [
    { field: "name", column: subcategories.name, value: values.name },
    { field: "slug", column: subcategories.slug, value: values.slug },
    {
      field: "abbreviation",
      column: subcategories.abbreviation,
      value: values.abbreviation,
    },
  ] as const;
  for (const check of subcategoryChecks) {
    if (!check.value) continue;
    const [match] = await db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(sql`lower(${check.column}) = lower(${check.value})`)
      .limit(1);
    if (match) return check.field;
  }

  return null;
}

async function findSubcategoryIdentifierConflict(
  values: IdentifierValues,
  excludeId?: string,
) {
  const db = getDb();
  const checks = [
    { field: "name", column: subcategories.name, value: values.name },
    { field: "slug", column: subcategories.slug, value: values.slug },
    {
      field: "abbreviation",
      column: subcategories.abbreviation,
      value: values.abbreviation,
    },
  ] as const;

  for (const check of checks) {
    if (!check.value) continue;
    const sameValue = sql`lower(${check.column}) = lower(${check.value})`;
    const [match] = await db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(
        excludeId ? and(sameValue, ne(subcategories.id, excludeId)) : sameValue,
      )
      .limit(1);
    if (match) return check.field;
  }

  const categoryChecks = [
    { field: "name", column: categories.name, value: values.name },
    { field: "slug", column: categories.slug, value: values.slug },
    {
      field: "abbreviation",
      column: categories.abbreviation,
      value: values.abbreviation,
    },
  ] as const;
  for (const check of categoryChecks) {
    if (!check.value) continue;
    const [match] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(sql`lower(${check.column}) = lower(${check.value})`)
      .limit(1);
    if (match) return check.field;
  }

  return null;
}

// ── Categories ────────────────────────────────────────────

adminRoutes.post("/categories", async (c) => {
  const db = getDb();
  const body = await c.req.json<{
    name: string;
    slug: string;
    abbreviation: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
  }>();

  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const abbreviation = body.abbreviation?.trim().toUpperCase();
  if (!name || !slug || !abbreviation) {
    return c.json({ error: "name, slug and abbreviation are required" }, 400);
  }
  if (abbreviation.length > 5) {
    return c.json(
      { error: "abbreviation must contain at most 5 characters" },
      400,
    );
  }

  const conflict = await findCategoryIdentifierConflict({
    name,
    slug,
    abbreviation,
  });
  if (conflict) {
    return c.json({ error: `Category ${conflict} must be unique` }, 409);
  }

  try {
    const [category] = await db
      .insert(categories)
      .values({
        name,
        slug,
        abbreviation,
        description: body.description?.trim() || null,
        icon: body.icon ?? null,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();

    return c.json(category, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ error: "Category identifiers must be unique" }, 409);
    }
    throw error;
  }
});

adminRoutes.put("/categories/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    slug?: string;
    abbreviation?: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
  }>();

  /*
   * Build a normalized update object instead of passing request data directly
   * to Drizzle. This keeps whitespace and casing rules identical to creation.
   */
  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const abbreviation = body.abbreviation?.trim().toUpperCase();
  if (body.name !== undefined && !name) {
    return c.json({ error: "name is required" }, 400);
  }
  if (body.slug !== undefined && !slug) {
    return c.json({ error: "slug is required" }, 400);
  }
  if (
    body.abbreviation !== undefined &&
    (!abbreviation || abbreviation.length > 5)
  ) {
    return c.json(
      { error: "abbreviation must contain between 1 and 5 characters" },
      400,
    );
  }

  const conflict = await findCategoryIdentifierConflict(
    { name, slug, abbreviation },
    id,
  );
  if (conflict) {
    return c.json({ error: `Category ${conflict} must be unique` }, 409);
  }

  const update: Partial<typeof categories.$inferInsert> = {};
  if (name !== undefined) update.name = name;
  if (slug !== undefined) update.slug = slug;
  if (body.description !== undefined) {
    update.description = body.description?.trim() || null;
  }
  if (body.icon !== undefined) update.icon = body.icon;
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
  if (abbreviation !== undefined) update.abbreviation = abbreviation;

  try {
    const [updated] = await db
      .update(categories)
      .set(update)
      .where(eq(categories.id, id))
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ error: "Category identifiers must be unique" }, 409);
    }
    throw error;
  }
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
    abbreviation: string;
    description?: string;
    sortOrder?: number;
  }>();

  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const abbreviation = body.abbreviation?.trim().toUpperCase();
  if (!body.categoryId || !name || !slug || !abbreviation) {
    return c.json(
      { error: "categoryId, name, slug and abbreviation are required" },
      400,
    );
  }
  if (abbreviation.length > 5) {
    return c.json(
      { error: "abbreviation must contain at most 5 characters" },
      400,
    );
  }

  const conflict = await findSubcategoryIdentifierConflict({
    name,
    slug,
    abbreviation,
  });
  if (conflict) {
    return c.json({ error: `Subcategory ${conflict} must be unique` }, 409);
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

  try {
    const [sub] = await db
      .insert(subcategories)
      .values({
        categoryId: body.categoryId,
        parentSubcategoryId: body.parentSubcategoryId ?? null,
        name,
        slug,
        abbreviation,
        description: body.description?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();

    return c.json(sub, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ error: "Subcategory identifiers must be unique" }, 409);
    }
    throw error;
  }
});

adminRoutes.put("/subcategories/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    slug?: string;
    abbreviation?: string;
    description?: string | null;
    sortOrder?: number;
  }>();

  /*
   * Normalize subcategory updates exactly like category updates. Building an
   * explicit object also prevents arbitrary request keys from reaching SQL.
   */
  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const abbreviation = body.abbreviation?.trim().toUpperCase();
  if (body.name !== undefined && !name) {
    return c.json({ error: "name is required" }, 400);
  }
  if (body.slug !== undefined && !slug) {
    return c.json({ error: "slug is required" }, 400);
  }
  if (
    body.abbreviation !== undefined &&
    (!abbreviation || abbreviation.length > 5)
  ) {
    return c.json(
      { error: "abbreviation must contain between 1 and 5 characters" },
      400,
    );
  }

  const conflict = await findSubcategoryIdentifierConflict(
    { name, slug, abbreviation },
    id,
  );
  if (conflict) {
    return c.json({ error: `Subcategory ${conflict} must be unique` }, 409);
  }

  const update: Partial<typeof subcategories.$inferInsert> = {};
  if (name !== undefined) update.name = name;
  if (slug !== undefined) update.slug = slug;
  if (body.description !== undefined) {
    update.description = body.description?.trim() || null;
  }
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
  if (abbreviation !== undefined) update.abbreviation = abbreviation;

  try {
    const [updated] = await db
      .update(subcategories)
      .set(update)
      .where(eq(subcategories.id, id))
      .returning();

    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ error: "Subcategory identifiers must be unique" }, 409);
    }
    throw error;
  }
});

adminRoutes.delete("/subcategories/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  await db.delete(subcategories).where(eq(subcategories.id, id));
  return c.json({ success: true });
});

export { adminRoutes };
