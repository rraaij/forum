# Forum Monorepo — Implementation Plan

## Context

The forum project is built as a Turborepo monorepo. PostgreSQL + Drizzle ORM replaces Convex DB, deployed to QNAP NAS (same pattern as `stuff-to-watch`).

**Key decisions:**
- PostgreSQL + Drizzle (no Convex)
- Bun runtime + pnpm package manager
- Incremental scope: scaffolding + shared packages + Forum app first
- Auth in `packages/api` (Hono + Better Auth), schema-only in `packages/db`
- Hono WebSocket for future DM app

---

## Target Structure

```text
apps/
  forum/       # Internet forum (SolidJS/SolidStart) — Categories > Subcategories > Topics > Posts
  frontpage/   # News aggregator with comments/votes (SolidJS/SolidStart), GNews.io API
  profile/     # User profiles and settings (SolidJS)
  dm/          # Real-time direct messaging via WebSockets (SolidJS)
packages/
  api/         # Shared Hono backend
  ui/          # Shared SolidJS components — DaisyUI component library
  db/          # Drizzle schema, Better Auth tables
  config/      # Shared Vite, Biome, TypeScript configs
```

## Stack

- **Frontend**: SolidJS, TanStack Router/Start, TypeScript, TailwindCSS, DaisyUI
- **Backend**: Bun, Hono (shared across apps in `packages/api`)
- **Database/Auth**: PostgreSQL, Drizzle ORM, Better Auth (SSO across all apps)
- **Monorepo**: Turborepo, pnpm workspaces

---

## Phase 1 — Monorepo Scaffolding

**Goal:** Working Turborepo workspace where `pnpm install` succeeds.

### Files:
- `package.json` — workspace root with `turbo run` scripts
- `pnpm-workspace.yaml` — `packages: ["apps/*", "packages/*"]`
- `turbo.json` — task pipeline: `build`, `dev`, `lint`, `check`, `db:generate`, `db:migrate`
- `.env.example` — Postgres credentials, AUTH_SECRET, APP_URL

**Gate:** `pnpm install` clean, `turbo --dry` shows graph.

---

## Phase 2 — Shared Packages

Build in dependency order: `config` → `db` → `api` → `ui`.

### 2A — `packages/config` (shared TypeScript configs)

- `tsconfig.base.json` — Strict, ESM, bundler resolution
- `tsconfig.solidjs.json` — Extends base + jsx: preserve, jsxImportSource: solid-js, DOM libs
- `tsconfig.node.json` — Extends base + Bun types, no DOM

### 2B — `packages/db` (Drizzle schema only)

Database schema:

| Table | Key columns | Notes |
|-------|------------|-------|
| `users` | id (text PK), name, email, role, emailVerified | Better Auth generates IDs as text |
| `sessions` | id, userId FK, token, expiresAt | Better Auth managed |
| `accounts` | id, userId FK, providerId, password | email/password auth |
| `categories` | id (uuid), name, slug, description, icon, sortOrder | Top-level forum structure |
| `subcategories` | id (uuid), categoryId FK, name, slug, sortOrder | Nested under categories |
| `topics` | id (uuid), subcategoryId FK, authorId FK, title, slug, isPinned, isLocked, viewCount, postCount, lastPostAt | Denormalized counters |
| `posts` | id (uuid), topicId FK, authorId FK, content, isDeleted, editedAt | Markdown content |
| `reactions` | id (uuid), postId FK, userId FK, emoji | Unique constraint on (post, user, emoji) |
| `votes` | id (uuid), postId FK, userId FK, value (+1/-1) | Unique constraint on (post, user) |

### 2C — `packages/api` (Hono backend + Better Auth)

- Bun.serve entry point, Hono app factory
- Better Auth instance with drizzleAdapter
- Session middleware (cookie → Hono context)
- Route modules: auth, categories, topics, posts, reactions, votes
- API runs on port 4000 in dev

### 2D — `packages/ui` (shared SolidJS components)

- DaisyUI component wrappers: Button, Avatar, Modal, Badge
- No build step — consumers import directly from src

**Gate:** `tsc -b` passes, Hono starts, Better Auth sign-in returns session.

---

## Phase 3 — Forum App (SolidStart)

- SolidStart + TanStack Router with file-based routing
- TailwindCSS + DaisyUI theming
- Better Auth SolidJS client (useSession, signIn, signOut)
- Routes: home (categories), auth (sign-in/sign-up), `[category]/[sub]/[topic]`
- Vite proxy `/api/*` → port 4000
- **Lurking mode:** GET routes public, POST/PUT/DELETE require auth

**Gate:** Forum renders at `:3001`, Vite proxy works, auth flow complete.

---

## Phase 4 — Database Migration + Seed

1. `db:generate` — creates migration SQL
2. `db:push` — applies schema to QNAP PostgreSQL
3. Seed script for dev categories + subcategories

---

## Phase 5 — Forum CRUD Features

Build incrementally:
1. Read-only forum tree (category → subcategory → topics → posts)
2. Topic creation (auth required)
3. Post/reply creation (auth required)
4. Emoji reactions (toggle, grouped counts)
5. Upvote/downvote (toggle logic, score display)

**Gate:** Guest browses freely. Signed-in user creates + reacts + votes. `tsc -b && biome check` clean.

---

## Phase 6 — Docker + QNAP Deployment

- Multi-stage Dockerfile (deps → build → runtime)
- Deploy script: build → docker save → SCP to NAS → docker load → run
- DB migrations run from dev machine before deploying

---

## Feature Roadmap (Future)

### Frontpage App
- News aggregator using GNews.io API
- Comments on articles (auth required), upvote/downvote

### Profile App
- User information, photos, posts, reactions
- Profile editing, settings for Forum and Frontpage

### Direct Messaging App
- Real-time DMs via WebSocket
- Read receipts, typing indicators, emoji reactions
