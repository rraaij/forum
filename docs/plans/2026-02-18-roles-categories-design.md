# Design: Roles + Admin Category Management

**Date:** 2026-02-18
**Branch:** feature/forum-design-codex

---

## Overview

Introduce a 3-role system (user, moderator, admin) and an admin-only dialog in the page header for full CRUD management of the category hierarchy (Category → Subcategory → Sub-subcategory).

---

## Roles

| Role | Capabilities |
|---|---|
| `user` | Create topics, create posts, react with emojis, upvote/downvote posts |
| `moderator` | Everything user can do, plus: pin/lock topics, delete posts, punish users (temp ban, delete all posts) |
| `admin` | Everything moderator can do, plus: create/edit/delete categories and subcategories |

Role is stored in `users.role` (text, default `"user"`). Already in the schema — no new column needed.

---

## Section 1 — Data Model

### subcategories table — add `parentSubcategoryId`

Add a nullable self-referential FK to support one extra level of nesting:

```
subcategories
  id                    uuid PK
  categoryId            FK → categories (NOT NULL)
  parentSubcategoryId   FK → subcategories (nullable)
  name, slug, description, sortOrder, createdAt

Rules:
  - parentSubcategoryId = null  → direct child of a category (Subcategory)
  - parentSubcategoryId ≠ null  → child of a subcategory (Sub-subcategory)
  - API enforces max 1 level of nesting (no sub-sub-subcategories)
```

### topics table — add `categoryId`, make `subcategoryId` nullable

Topics can now live directly under a category or under a subcategory:

```
topics
  categoryId     FK → categories (nullable)
  subcategoryId  FK → subcategories (nullable)

Rule: exactly one of categoryId / subcategoryId must be non-null (enforced at API level)
```

### Full hierarchy

```
Category
  ├── Topics (direct)
  └── Subcategory
        ├── Topics
        └── Sub-subcategory
              └── Topics
```

---

## Section 2 — API

### Admin middleware

New `adminGuard` middleware in `packages/api/src/middleware/admin.ts`:
- Returns `403` if `c.get("user")?.role !== "admin"`
- Applied to all `/api/admin/*` routes

### New admin routes (`packages/api/src/routes/admin.ts`)

| Method | Route | Action |
|---|---|---|
| `POST` | `/api/admin/categories` | Create category |
| `PUT` | `/api/admin/categories/:id` | Update category (name, slug, description, icon, sortOrder) |
| `DELETE` | `/api/admin/categories/:id` | Delete category (cascades to subcategories and topics) |
| `POST` | `/api/admin/subcategories` | Create subcategory or sub-subcategory |
| `PUT` | `/api/admin/subcategories/:id` | Update subcategory |
| `DELETE` | `/api/admin/subcategories/:id` | Delete subcategory (cascades) |

### Existing public GET route update

`GET /api/categories` response extended to include `parentSubcategoryId` on subcategory objects so the frontend can build the tree client-side.

---

## Section 3 — Frontend

### Header (`apps/forum/src/app.tsx`)

- When `user.role === "admin"`, render a gear/settings icon button in the navbar
- Clicking it opens `CategoryManagerDialog`
- Button is not rendered at all for non-admin users

### CategoryManagerDialog (`apps/forum/src/components/CategoryManagerDialog.tsx`)

- Wraps the existing `Modal` from `packages/ui`
- Fetches full category tree via `createResource` when dialog opens
- Renders a 3-level accordion tree:
  - Expand/collapse per category row
  - `+` button next to each level inserts an inline form row
  - Pencil icon swaps the label for an inline input (name + optional description)
  - Trash icon shows inline "Confirm?" before deleting
- All mutations call admin API endpoints and refetch the tree on success
- Slug is auto-generated from name (lowercased, spaces → hyphens) but editable

### Better Auth role exposure

Configure Better Auth's `additionalFields` for `user` in `packages/api/src/auth.ts` to include `role` in the session response, making it accessible via `useSession()` on the frontend.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `packages/db/src/schema/forum.ts` | Add `parentSubcategoryId` to subcategories; add `categoryId`, make `subcategoryId` nullable on topics |
| `packages/db/src/schema/interactions.ts` | Update any relations referencing `subcategoryId` if needed |
| `packages/api/src/auth.ts` | Add `role` to Better Auth `additionalFields` |
| `packages/api/src/middleware/admin.ts` | New `adminGuard` middleware |
| `packages/api/src/routes/admin.ts` | New admin CRUD routes |
| `packages/api/src/routes/index.ts` | Mount admin routes under `/admin` |
| `packages/api/src/routes/categories.ts` | Include `parentSubcategoryId` in GET response |
| `apps/forum/src/app.tsx` | Add admin button to navbar |
| `apps/forum/src/components/CategoryManagerDialog.tsx` | New admin dialog component |
