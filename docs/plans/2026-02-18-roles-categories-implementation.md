# Roles + Admin Category Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 3-role system (user/moderator/admin) and an admin-only accordion dialog in the page header for full CRUD management of a 3-level category hierarchy.

**Architecture:** Schema gains `parentSubcategoryId` on subcategories and an optional `categoryId` on topics. The API gets an `adminGuard` middleware and new `/api/admin/*` routes. The frontend header shows a gear button for admins that opens a `CategoryManagerDialog` with an inline accordion tree.

**Tech Stack:** Drizzle ORM (schema + migration), Hono (middleware + routes), Better Auth (additionalFields), SolidJS (createResource, createSignal, For, Show), DaisyUI (accordion, inputs, buttons), existing `Modal` from `@forum/ui`.

---

## Task 1: Schema — add `parentSubcategoryId` to subcategories

**Files:**
- Modify: `packages/db/src/schema/forum.ts`

**Step 1: Add the self-referential FK**

In `packages/db/src/schema/forum.ts`, update the `subcategories` table definition. Add `parentSubcategoryId` as a nullable FK that points to `subcategories.id`:

```ts
export const subcategories = pgTable(
  "subcategories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    parentSubcategoryId: uuid("parent_subcategory_id").references(
      (): AnyPgColumn => subcategories.id,
      { onDelete: "cascade" },
    ),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subcategories_category_slug_idx").on(
      table.categoryId,
      table.slug,
    ),
  ],
);
```

Add the `AnyPgColumn` import at the top (required for self-referential FKs in Drizzle):

```ts
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
```

**Step 2: Verify TypeScript compiles**

Run from repo root:
```bash
cd packages/db && bun --bun run tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/db/src/schema/forum.ts
git commit -m "feat(db): add parentSubcategoryId to subcategories for nested structure"
```

---

## Task 2: Schema — make `subcategoryId` nullable on topics, add `categoryId`

**Files:**
- Modify: `packages/db/src/schema/forum.ts`

**Step 1: Update the topics table**

Topics can now be attached to a category OR a subcategory (exactly one, enforced at the API level). Change `subcategoryId` to nullable and add `categoryId`:

```ts
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    subcategoryId: uuid("subcategory_id").references(() => subcategories.id, {
      onDelete: "cascade",
    }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
    lastPostAt: timestamp("last_post_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("topics_subcategory_idx").on(table.subcategoryId),
    index("topics_category_idx").on(table.categoryId),
    index("topics_author_idx").on(table.authorId),
  ],
);
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/db && bun --bun run tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/db/src/schema/forum.ts
git commit -m "feat(db): make topics.subcategoryId nullable, add categoryId FK"
```

---

## Task 3: Run DB migration

**Step 1: Generate migration**

Run from `packages/db`:
```bash
cd packages/db && bun run db:push
```
This applies the schema changes directly to the QNAP PostgreSQL instance. Expected: Drizzle confirms the changes were applied.

> If you want a migration file instead: `bun run db:generate` then `bun run db:migrate`.

**Step 2: Verify columns exist**

Connect to the DB and run:
```sql
\d subcategories
\d topics
```
Expected: `parent_subcategory_id` column on subcategories, `category_id` column on topics, `subcategory_id` now nullable.

---

## Task 4: Configure Better Auth to expose `role` in session

**Files:**
- Modify: `packages/api/src/auth.ts`

Better Auth's `additionalFields` tells it to include custom user columns in the session response. Without this, `role` exists in the DB but is never sent to the client.

**Step 1: Add `user.additionalFields` config**

```ts
import { accounts, sessions, users } from "@forum/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // users cannot set their own role
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  secret:
    process.env.AUTH_SECRET || "development-secret-min-32-characters-long",
  baseURL: process.env.API_URL || "http://localhost:4000",
  trustedOrigins: [process.env.APP_URL || "http://localhost:3001"],
});

export type Session = typeof auth.$Infer.Session;
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && bun --bun run tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/api/src/auth.ts
git commit -m "feat(api): expose role field in Better Auth session via additionalFields"
```

---

## Task 5: Add `SessionUser` type to auth-client

**Files:**
- Modify: `apps/forum/src/lib/auth-client.ts`

The frontend needs to know that `user.role` exists. We extend the inferred type locally so TypeScript is happy without needing a cross-package import.

**Step 1: Export `SessionUser` type**

```ts
import { createAuthClient } from "better-auth/solid";

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

export type SessionUser = (typeof authClient.$Infer.Session)["user"] & {
  role: "user" | "moderator" | "admin";
};

export const useSession = authClient.useSession;
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/forum && bun --bun run tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add apps/forum/src/lib/auth-client.ts
git commit -m "feat(forum): add SessionUser type with role field"
```

---

## Task 6: Create `adminGuard` middleware

**Files:**
- Create: `packages/api/src/middleware/admin.ts`

**Step 1: Create the middleware**

```ts
import type { Context, Next } from "hono";
import type { AppEnv } from "../types";

export async function adminGuard(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");

  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && bun --bun run tsc --noEmit
```
Expected: no errors. Note: `user.role` must exist on the `AppEnv` user type. Check `packages/api/src/types.ts` — `role: string` is already there.

**Step 3: Commit**

```bash
git add packages/api/src/middleware/admin.ts
git commit -m "feat(api): add adminGuard middleware for role-based route protection"
```

---

## Task 7: Create admin routes (categories + subcategories CRUD)

**Files:**
- Create: `packages/api/src/routes/admin.ts`

**Step 1: Create the file**

```ts
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
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && bun --bun run tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/api/src/routes/admin.ts
git commit -m "feat(api): add admin CRUD routes for categories and subcategories"
```

---

## Task 8: Mount admin routes

**Files:**
- Modify: `packages/api/src/routes/index.ts`

**Step 1: Add the admin route mount**

```ts
import type { Hono } from "hono";
import type { AppEnv } from "../types";
import { authRoutes } from "./auth";
import { adminRoutes } from "./admin";
import { categoriesRoutes } from "./categories";
import { postsRoutes } from "./posts";
import { reactionsRoutes } from "./reactions";
import { topicsRoutes } from "./topics";
import { votesRoutes } from "./votes";

export function mountRoutes(app: Hono<AppEnv>) {
  app.route("/api/auth", authRoutes);
  app.route("/api/admin", adminRoutes);
  app.route("/api/categories", categoriesRoutes);
  app.route("/api/topics", topicsRoutes);
  app.route("/api/posts", postsRoutes);
  app.route("/api/reactions", reactionsRoutes);
  app.route("/api/votes", votesRoutes);
}
```

**Step 2: Manual test**

Start the API (`bun --bun run dev` in `packages/api`) and verify:
```bash
curl -X POST http://localhost:4000/api/admin/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","slug":"test"}'
# Expected: 403 Forbidden (no session)
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/index.ts
git commit -m "feat(api): mount admin routes at /api/admin"
```

---

## Task 9: Update topics routes to support `categoryId`

**Files:**
- Modify: `packages/api/src/routes/topics.ts`

The GET list query filters by `subcategoryId`. It now also needs to support `categoryId`. The POST (create topic) must accept either field and validate that exactly one is provided.

**Step 1: Update GET handler**

Replace the existing `GET /` handler:

```ts
topicsRoutes.get("/", async (c) => {
  const db = getDb();
  const subcategoryId = c.req.query("subcategoryId");
  const categoryId = c.req.query("categoryId");

  if (!subcategoryId && !categoryId) {
    return c.json(
      { error: "subcategoryId or categoryId is required" },
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
    })
    .from(topics)
    .leftJoin(users, eq(topics.authorId, users.id))
    .where(
      subcategoryId
        ? eq(topics.subcategoryId, subcategoryId)
        : eq(topics.categoryId, categoryId!),
    )
    .orderBy(desc(topics.isPinned), desc(topics.lastPostAt));

  return c.json(result);
});
```

**Step 2: Update POST handler**

Replace the body type and validation in `POST /`:

```ts
topicsRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const body = await c.req.json<{
    categoryId?: string;
    subcategoryId?: string;
    title: string;
    content: string;
  }>();

  if (!body.categoryId && !body.subcategoryId) {
    return c.json({ error: "categoryId or subcategoryId is required" }, 400);
  }
  if (body.categoryId && body.subcategoryId) {
    return c.json(
      { error: "Provide categoryId or subcategoryId, not both" },
      400,
    );
  }

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
});
```

Also add the `categories` import at the top of the file:
```ts
import { categories, posts, subcategories, topics, users } from "@forum/db/schema";
```

**Step 3: Verify TypeScript compiles**

```bash
cd packages/api && bun --bun run tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add packages/api/src/routes/topics.ts
git commit -m "feat(api): support categoryId on topics for direct category attachment"
```

---

## Task 10: Add admin gear button to header

**Files:**
- Modify: `apps/forum/src/app.tsx`

**Step 1: Add the button and dialog state**

The admin button only renders when `user.role === "admin"`. It controls `CategoryManagerDialog` open state.

Replace the entire `app.tsx`:

```tsx
import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createSignal, Show, Suspense } from "solid-js";
import "./styles.css";
import { signOut, useSession } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth-client";
import { CategoryManagerDialog } from "@/components/CategoryManagerDialog";

export default function App() {
  const [adminOpen, setAdminOpen] = createSignal(false);

  return (
    <Router
      root={(props) => {
        const session = useSession();
        const user = () => session().data?.user as SessionUser | undefined;

        return (
          <div class="min-h-screen bg-base-200">
            <div class="navbar bg-base-100 shadow-sm">
              <div class="flex-1">
                <A href="/" class="btn btn-ghost text-xl">
                  Forum
                </A>
              </div>
              <div class="flex-none gap-2">
                <Show when={user()?.role === "admin"}>
                  <button
                    class="btn btn-ghost btn-sm"
                    onClick={() => setAdminOpen(true)}
                    title="Manage categories"
                  >
                    ⚙️ Manage
                  </button>
                </Show>
                <Show
                  when={user()}
                  fallback={
                    <div class="flex gap-2">
                      <A href="/auth/sign-in" class="btn btn-ghost btn-sm">
                        Sign In
                      </A>
                      <A href="/auth/sign-up" class="btn btn-primary btn-sm">
                        Sign Up
                      </A>
                    </div>
                  }
                >
                  {(u) => (
                    <div class="dropdown dropdown-end">
                      <button
                        tabindex="0"
                        class="btn btn-ghost btn-circle avatar placeholder"
                      >
                        <div class="bg-neutral text-neutral-content w-8 rounded-full">
                          <span class="text-xs">
                            {u().name?.charAt(0).toUpperCase() ?? "?"}
                          </span>
                        </div>
                      </button>
                      <ul
                        tabindex="0"
                        class="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
                      >
                        <li class="menu-title">{u().name}</li>
                        <li>
                          <button onClick={() => signOut()}>Sign Out</button>
                        </li>
                      </ul>
                    </div>
                  )}
                </Show>
              </div>
            </div>
            <main class="container mx-auto px-4 py-6">
              <Suspense>{props.children}</Suspense>
            </main>
            <CategoryManagerDialog
              open={adminOpen()}
              onClose={() => setAdminOpen(false)}
            />
          </div>
        );
      }}
    >
      <FileRoutes />
    </Router>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/forum && bun --bun run tsc --noEmit
```
Expected: error about missing `CategoryManagerDialog` module — that's expected until Task 11.

**Step 3: Commit** (after Task 11 compiles cleanly)

Hold this commit until Task 11 is done.

---

## Task 11: Create `CategoryManagerDialog` component

**Files:**
- Create: `apps/forum/src/components/CategoryManagerDialog.tsx`

**Step 1: Create the file**

```tsx
import { Modal } from "@forum/ui";
import type { Component } from "solid-js";
import { createSignal, For, Show, createResource } from "solid-js";
import { apiFetch } from "@/lib/api";

interface Subcategory {
  id: string;
  categoryId: string;
  parentSubcategoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  subcategories: Subcategory[];
}

interface InlineForm {
  name: string;
  slug: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Inline edit form ──────────────────────────────────────

function EditForm(props: {
  form: InlineForm;
  onNameInput: (v: string) => void;
  onSlugInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="flex gap-2 items-center flex-1">
      <input
        class="input input-sm input-bordered flex-1"
        value={props.form.name}
        onInput={(e) => props.onNameInput(e.currentTarget.value)}
        placeholder="Name"
      />
      <input
        class="input input-sm input-bordered w-32"
        value={props.form.slug}
        onInput={(e) => props.onSlugInput(e.currentTarget.value)}
        placeholder="slug"
      />
      <button class="btn btn-sm btn-primary" onClick={props.onSave}>
        Save
      </button>
      <button class="btn btn-sm btn-ghost" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  );
}

// ── Inline add form ───────────────────────────────────────

function AddForm(props: {
  form: InlineForm;
  label: string;
  onNameInput: (v: string) => void;
  onSlugInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="flex gap-2 items-center mt-1">
      <input
        class="input input-sm input-bordered flex-1"
        value={props.form.name}
        onInput={(e) => props.onNameInput(e.currentTarget.value)}
        placeholder={props.label}
        autofocus
      />
      <input
        class="input input-sm input-bordered w-32"
        value={props.form.slug}
        onInput={(e) => props.onSlugInput(e.currentTarget.value)}
        placeholder="slug"
      />
      <button class="btn btn-sm btn-primary" onClick={props.onSave}>
        Add
      </button>
      <button class="btn btn-sm btn-ghost" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────

function DeleteConfirm(props: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div class="flex gap-1 items-center">
      <span class="text-sm text-error">Delete?</span>
      <button class="btn btn-xs btn-error" onClick={props.onConfirm}>
        Yes
      </button>
      <button class="btn btn-xs btn-ghost" onClick={props.onCancel}>
        No
      </button>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────

export const CategoryManagerDialog: Component<{
  open: boolean;
  onClose: () => void;
}> = (props) => {
  // Use a counter as the resource key so we can manually refetch
  const [fetchKey, setFetchKey] = createSignal(0);
  const [data] = createResource(
    () => (props.open ? fetchKey() : undefined),
    () => apiFetch<Category[]>("/categories"),
  );

  const refetch = () => setFetchKey((k) => k + 1);

  // Accordion expand state
  const [expanded, setExpanded] = createSignal(new Set<string>());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Edit state
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [editForm, setEditForm] = createSignal<InlineForm>({
    name: "",
    slug: "",
  });

  type AddMode =
    | { type: "category" }
    | {
        type: "subcategory";
        categoryId: string;
        parentSubcategoryId?: string;
      };
  const [addMode, setAddMode] = createSignal<AddMode | null>(null);
  const [addForm, setAddForm] = createSignal<InlineForm>({
    name: "",
    slug: "",
  });

  // Delete confirm state
  const [deletingId, setDeletingId] = createSignal<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────

  const startEdit = (item: {
    id: string;
    name: string;
    slug: string;
  }) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, slug: item.slug });
  };

  const saveEdit = async (
    endpoint: "categories" | "subcategories",
    id: string,
  ) => {
    const f = editForm();
    await apiFetch(`/admin/${endpoint}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: f.name, slug: f.slug }),
    });
    setEditingId(null);
    refetch();
  };

  const saveAdd = async () => {
    const mode = addMode();
    if (!mode) return;
    const f = addForm();

    if (mode.type === "category") {
      await apiFetch("/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: f.name, slug: f.slug }),
      });
    } else {
      await apiFetch("/admin/subcategories", {
        method: "POST",
        body: JSON.stringify({
          categoryId: mode.categoryId,
          parentSubcategoryId: mode.parentSubcategoryId ?? null,
          name: f.name,
          slug: f.slug,
        }),
      });
    }

    setAddMode(null);
    setAddForm({ name: "", slug: "" });
    refetch();
  };

  const deleteItem = async (
    endpoint: "categories" | "subcategories",
    id: string,
  ) => {
    await apiFetch(`/admin/${endpoint}/${id}`, { method: "DELETE" });
    setDeletingId(null);
    refetch();
  };

  const startAdd = (mode: AddMode, expandId?: string) => {
    setAddMode(mode);
    setAddForm({ name: "", slug: "" });
    if (expandId) {
      setExpanded((prev) => new Set([...prev, expandId]));
    }
  };

  const updateAddName = (v: string) =>
    setAddForm({ name: v, slug: toSlug(v) });
  const updateAddSlug = (v: string) => setAddForm((f) => ({ ...f, slug: v }));
  const updateEditName = (v: string) =>
    setEditForm({ name: v, slug: toSlug(v) });
  const updateEditSlug = (v: string) => setEditForm((f) => ({ ...f, slug: v }));

  // ── Render helpers ────────────────────────────────────────

  const ItemActions = (p: {
    id: string;
    endpoint: "categories" | "subcategories";
    onEdit: () => void;
    addLabel?: string;
    onAdd?: () => void;
  }) => (
    <Show
      when={deletingId() === p.id}
      fallback={
        <div class="flex gap-1 shrink-0">
          <button
            class="btn btn-xs btn-ghost"
            onClick={p.onEdit}
            title="Edit"
          >
            ✏️
          </button>
          <button
            class="btn btn-xs btn-ghost text-error"
            onClick={() => setDeletingId(p.id)}
            title="Delete"
          >
            🗑️
          </button>
          <Show when={p.onAdd}>
            <button
              class="btn btn-xs btn-ghost"
              onClick={p.onAdd}
              title={p.addLabel}
            >
              + Sub
            </button>
          </Show>
        </div>
      }
    >
      <DeleteConfirm
        onConfirm={() => deleteItem(p.endpoint, p.id)}
        onCancel={() => setDeletingId(null)}
      />
    </Show>
  );

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Manage Categories"
      class="max-w-2xl w-full"
    >
      <div class="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <Show
          when={!data.loading}
          fallback={
            <div class="flex justify-center py-8">
              <span class="loading loading-spinner loading-lg" />
            </div>
          }
        >
          <For
            each={data()}
            fallback={
              <p class="text-base-content/60 text-sm">No categories yet.</p>
            }
          >
            {(cat) => (
              <div class="border border-base-300 rounded-lg overflow-hidden">
                {/* Category row */}
                <div class="flex items-center gap-2 px-3 py-2 bg-base-100">
                  <button
                    class="btn btn-xs btn-ghost"
                    onClick={() => toggle(cat.id)}
                  >
                    {expanded().has(cat.id) ? "▼" : "▶"}
                  </button>
                  <Show
                    when={editingId() === cat.id}
                    fallback={
                      <span class="flex-1 font-semibold">
                        <Show when={cat.icon}>
                          <span class="mr-1">{cat.icon}</span>
                        </Show>
                        {cat.name}
                      </span>
                    }
                  >
                    <EditForm
                      form={editForm()}
                      onNameInput={updateEditName}
                      onSlugInput={updateEditSlug}
                      onSave={() => saveEdit("categories", cat.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  </Show>
                  <Show when={editingId() !== cat.id}>
                    <ItemActions
                      id={cat.id}
                      endpoint="categories"
                      onEdit={() => startEdit(cat)}
                      addLabel="Add subcategory"
                      onAdd={() => startAdd({ type: "subcategory", categoryId: cat.id }, cat.id)}
                    />
                  </Show>
                </div>

                {/* Subcategories (level 2) */}
                <Show when={expanded().has(cat.id)}>
                  <div class="px-4 py-2 space-y-1 bg-base-200/40">
                    <For
                      each={cat.subcategories.filter(
                        (s) => !s.parentSubcategoryId,
                      )}
                    >
                      {(sub) => (
                        <div class="border border-base-200 rounded bg-base-100">
                          <div class="flex items-center gap-2 px-2 py-1">
                            <button
                              class="btn btn-xs btn-ghost"
                              onClick={() => toggle(sub.id)}
                            >
                              {expanded().has(sub.id) ? "▼" : "▶"}
                            </button>
                            <Show
                              when={editingId() === sub.id}
                              fallback={
                                <span class="flex-1 text-sm">{sub.name}</span>
                              }
                            >
                              <EditForm
                                form={editForm()}
                                onNameInput={updateEditName}
                                onSlugInput={updateEditSlug}
                                onSave={() => saveEdit("subcategories", sub.id)}
                                onCancel={() => setEditingId(null)}
                              />
                            </Show>
                            <Show when={editingId() !== sub.id}>
                              <ItemActions
                                id={sub.id}
                                endpoint="subcategories"
                                onEdit={() => startEdit(sub)}
                                addLabel="Add sub-subcategory"
                                onAdd={() =>
                                  startAdd(
                                    {
                                      type: "subcategory",
                                      categoryId: cat.id,
                                      parentSubcategoryId: sub.id,
                                    },
                                    sub.id,
                                  )
                                }
                              />
                            </Show>
                          </div>

                          {/* Sub-subcategories (level 3) */}
                          <Show when={expanded().has(sub.id)}>
                            <div class="px-4 py-1 space-y-1 bg-base-200/40">
                              <For
                                each={cat.subcategories.filter(
                                  (s) => s.parentSubcategoryId === sub.id,
                                )}
                              >
                                {(subsub) => (
                                  <div class="flex items-center gap-2 px-2 py-1 border border-base-200 rounded bg-base-100">
                                    <Show
                                      when={editingId() === subsub.id}
                                      fallback={
                                        <span class="flex-1 text-sm">
                                          {subsub.name}
                                        </span>
                                      }
                                    >
                                      <EditForm
                                        form={editForm()}
                                        onNameInput={updateEditName}
                                        onSlugInput={updateEditSlug}
                                        onSave={() =>
                                          saveEdit("subcategories", subsub.id)
                                        }
                                        onCancel={() => setEditingId(null)}
                                      />
                                    </Show>
                                    <Show when={editingId() !== subsub.id}>
                                      <ItemActions
                                        id={subsub.id}
                                        endpoint="subcategories"
                                        onEdit={() => startEdit(subsub)}
                                      />
                                    </Show>
                                  </div>
                                )}
                              </For>
                              <Show
                                when={
                                  addMode()?.type === "subcategory" &&
                                  (
                                    addMode() as {
                                      parentSubcategoryId?: string;
                                    }
                                  ).parentSubcategoryId === sub.id
                                }
                              >
                                <AddForm
                                  form={addForm()}
                                  label="Sub-subcategory name"
                                  onNameInput={updateAddName}
                                  onSlugInput={updateAddSlug}
                                  onSave={saveAdd}
                                  onCancel={() => setAddMode(null)}
                                />
                              </Show>
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>

                    {/* Add subcategory form */}
                    <Show
                      when={
                        addMode()?.type === "subcategory" &&
                        !(
                          addMode() as { parentSubcategoryId?: string }
                        ).parentSubcategoryId &&
                        (addMode() as { categoryId: string }).categoryId ===
                          cat.id
                      }
                    >
                      <AddForm
                        form={addForm()}
                        label="Subcategory name"
                        onNameInput={updateAddName}
                        onSlugInput={updateAddSlug}
                        onSave={saveAdd}
                        onCancel={() => setAddMode(null)}
                      />
                    </Show>
                  </div>
                </Show>
              </div>
            )}
          </For>

          {/* Add category form */}
          <Show when={addMode()?.type === "category"}>
            <AddForm
              form={addForm()}
              label="Category name"
              onNameInput={updateAddName}
              onSlugInput={updateAddSlug}
              onSave={saveAdd}
              onCancel={() => setAddMode(null)}
            />
          </Show>

          <button
            class="btn btn-sm btn-outline w-full mt-2"
            onClick={() => startAdd({ type: "category" })}
          >
            + Add Category
          </button>
        </Show>
      </div>
    </Modal>
  );
};
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/forum && bun --bun run tsc --noEmit
```
Expected: no errors.

**Step 3: Commit both app.tsx and the new dialog**

```bash
git add apps/forum/src/app.tsx apps/forum/src/components/CategoryManagerDialog.tsx
git commit -m "feat(forum): add admin category manager dialog with accordion tree"
```

---

## Task 12: Full type and lint check

**Step 1: Run tsc across all packages**

```bash
cd /path/to/forum && bun --bun run tsc -b
```
Expected: no errors across the monorepo.

**Step 2: Run Biome check**

```bash
bun --bun run check
```
Expected: no lint or formatting errors. Fix any issues before proceeding.

**Step 3: Final commit if any auto-fixable issues were corrected**

```bash
git add -A
git commit -m "chore: fix biome lint issues after roles + category manager feature"
```

---

## Manual Verification Checklist

1. Sign in as an admin user → gear button `⚙️ Manage` appears in the navbar
2. Sign in as a regular user → gear button is not visible
3. Click gear button → dialog opens with current categories loaded
4. Expand a category → subcategories show
5. Click `+ Sub` on a category → inline form appears, fill name, click Add → refetches
6. Click `+ Sub` on a subcategory → sub-subcategory add form appears
7. Try to add a sub-sub-subcategory via API directly → receives 400 "Maximum nesting depth reached"
8. Click ✏️ on any item → inline edit form, change name, save → updates in place
9. Click 🗑️ → confirm prompt, click Yes → item removed
10. Close and reopen dialog → fresh data loaded
