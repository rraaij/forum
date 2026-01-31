# Copilot Assessment & Improvement Roadmap

> Scope: This document captures a high-level assessment of the current monorepo and actionable suggestions for improving code quality, architecture, DX, and product functionality.  
> Note: No code changes are made as part of this assessment.

## Quick Context

- **Monorepo**: Bun workspaces
- **Apps**: `apps/forum` (forum), `apps/frontpage` (news feed)
- **Packages**:
  - `packages/api`: Hono API (read-only endpoints; writes via Convex)
  - `packages/db`: Convex schema + queries/mutations + auth http routes
  - `packages/ui`: shared SolidJS components (Header/AuthProvider/Toasts/Auth UI)
- **Frontend stack**: SolidJS + TanStack Start/Router + TanStack Query
- **Styling**: Tailwind v4 + DaisyUI

## What’s Good / Working Well

1. **Clear separation of concerns**
   - DB logic in Convex (`packages/db`), HTTP read API in Hono (`packages/api`), shared UI in `packages/ui`.
2. **Monorepo ergonomics**
   - Workspace aliases (`@forum/ui`, `@forum/api`, `@forum/db`) are a good foundation for reuse.
3. **Baseline safety & quality tooling**
   - TypeScript strict mode; Biome configured; TS path mapping in apps.
4. **Read vs write path is pragmatic**
   - Reads through API server; authenticated writes directly via Convex is a reasonable approach (with consistent conventions).

## Key Risks / Gaps (Highest Priority)

### 1) Auth is not actually wired through the UI
- `packages/ui/src/components/Header.tsx` hardcodes `isLoggedIn = false`.
- `Login` / `UserMenu` components are placeholders (no real session, sign-in, or sign-out flow).

**Impact:** Users cannot meaningfully authenticate; any features requiring identity will be blocked.

**Suggested direction:** Define a single, shared “auth state contract” exposed by `@forum/ui` (e.g. `useCurrentUser()`, `signIn()`, `signOut()`), then consume it in both apps.

### 2) Data model identity consistency (authorId)
- `topics.authorId` and `posts.authorId` are `v.string()` in `schema.ts`.
- Normal mutations use `getAuthUserId(ctx)` (Convex Auth user id), but seed data sets `authorId: "admin"`.

**Impact:** Inconsistent author identifiers complicate joins, permissions, and UI.

**Suggested direction:** Decide on one of these and standardize:
- Store `authorId: Id<"users">` and always reference Convex users.
- Or store `authorId: string` but define it explicitly (e.g., `authUserId`) and handle seeded/system authors via a typed pattern.

### 3) API client typing drift risk
- `packages/api/src/client.ts` manually defines `Category/Topic/Post` interfaces.
- Convex already generates types (`packages/db/convex/_generated/...`).

**Impact:** Changes in DB schema may not be reflected in API client types, causing runtime mismatches.

**Suggested direction:** Prefer importing/re-exporting Convex-generated types (or generate API types from the Hono layer).

### 4) Env/SSR consistency
- UI reads `import.meta.env.VITE_CONVEX_URL` while server reads `Bun.env.VITE_CONVEX_URL`.
- SSR vs browser runtime behavior is handled ad-hoc in `AuthProvider`.

**Impact:** Confusing setup, easy to misconfigure; harder deployments.

**Suggested direction:** Centralize env validation/parsing (you already depend on `@t3-oss/env-core` in apps). Consider separate env keys for server vs client where appropriate.

### 5) Pagination & scaling
- `listTopics("all")` caps to `take(50)` but category-specific list uses `collect()`.

**Impact:** One category could grow without limits; performance issues and expensive queries.

**Suggested direction:** Add consistent pagination parameters (`limit`, `cursor`) for all list endpoints.

## Notable Inconsistencies / Paper Cuts

- Frontpage route calls `forumApi.listTopics("all")` and comments “TODO backend support” — but the Convex query already supports it.
- “New Topic” button exists in category UI but there’s no create-topic route/form yet.
- No `.github/workflows/*` found → no CI safety net.
- README is largely scaffold/template and doesn’t reflect the current architecture and actual run instructions (especially Convex).

## Recommended Improvement Plan (Engineering)

### A) Authentication & Authorization (foundation)
1. **Implement real auth UI integration**
   - Wire sign-in and session state to the UI.
   - Add sign-out.
2. **Define authorization rules at the DB layer**
   - Continue requiring auth in mutations.
   - Add role checks for moderation actions (admin delete/lock/etc.).
3. **Add a shared user model**
   - Expose `currentUser` query and use it in both apps.

### B) Data Model & Domain Enhancements
1. **Normalize identity fields**
   - Make `authorId` consistent and joinable.
2. **Add derived fields / denormalization where useful**
   - Topic: `lastPostAt`, `postCount`
   - Category: `topicCount`, `lastActivityAt`
3. **Introduce slugs**
   - Human readable URLs: `/category/:slug` / `/topic/:slug` while keeping IDs internally.

### C) API Layer & Type Safety
1. **Single source of truth for types**
   - Prefer Convex-generated types or generate from Hono route schemas.
2. **Add input validation for HTTP endpoints**
   - Hono has `@hono/zod-validator` already; use it consistently for query params/route params.
3. **Improve error mapping**
   - Standardize error shape `{ error, code, details }` across endpoints.

### D) Frontend Data & UX
1. **Use route loaders where it helps SSR**
   - TanStack Router loaders can reduce waterfall fetching.
2. **Query key conventions**
   - Standardize keys: `["topics", { categoryId, cursor, limit }]`.
3. **Optimistic updates + invalidation**
   - When creating posts/topics, optimistically update lists and invalidate relevant queries.

### E) DX / Repo Hygiene
1. **Add CI**
   - Minimal workflow: install + `bun lint` + `bun build`.
2. **Add `.env.example`**
   - Document required env vars for root + `packages/db`.
3. **Testing strategy**
   - Start with: unit tests for domain logic, API route tests, and a small e2e smoke test.
4. **Docs consolidation**
   - Replace README template text with accurate: setup, run, deploy, architecture.

## Suggested Product Features (Forum)

### Core forum features
- **Create Topic flow** (missing UI): title/content form, category selection, validation, success toast.
- **Topic editing** (owner/admin), **post editing** with edit history.
- **Reactions** (like/upvote), and optionally “accepted answer” for Q&A categories.
- **Rich text / Markdown** with safe rendering.
- **Attachments**: images/files (with size limits + virus scanning if public).

### Community & engagement
- **User profiles**: bio, avatar, stats, joined date.
- **Notifications**: replies, mentions, followed topics/categories.
- **Bookmarks / saved topics**.
- **Subscriptions**: follow category/topic.

### Moderation & admin
- **Roles & permissions**: user/mod/admin.
- **Report post** workflow.
- **Soft delete** vs hard delete.
- **Rate limiting / spam protection**: per-IP and per-user.
- **Audit log** for moderator actions.

### Search
- Basic: title/content search.
- Advanced: filter by category, author, date.
- Consider external search indexing later if needed.

## Suggested Product Features (Frontpage)

- **Link submissions** with URL, title, optional text.
- **Voting** with anti-abuse: one vote per user, rate-limits.
- **Ranking algorithms** (Hacker News style time-decay).
- **Domain extraction** from URL and display actual host.
- **Comments** as first-class: share forum topic/post model or build a parallel model.

## Observability / Ops Suggestions

- **Request logging** with correlation IDs.
- **Error reporting** (Sentry or similar) in both apps and API.
- **Performance**: track API latency + Convex query costs.

## Deployment Notes / Suggestions

- No `wrangler.toml` currently detected; the apps have `wrangler deploy` scripts.
- Suggestion: document the intended deployment targets per app (Cloudflare Pages/Workers?) and define a repeatable pipeline (CI deploy environments).

---

### “Next best step” recommendation

If the goal is to ship meaningful functionality quickly: **implement end-to-end auth + current user state**, then add **Create Topic UI** and **pagination**. Those unblock most other features and reduce future rewrites.

---

# WorkOS Auth (AuthKit) Migration Plan

## Why WorkOS (and Free Tier Check)

WorkOS pricing currently states:
- **“First 1 million active users free”** (monthly active users).  
Source: https://workos.com/pricing

This is generally generous enough for early-stage/community projects, and WorkOS also provides staging environments to test integrations before production.

## Target Authentication Architecture

### Goals
- One auth system for **both** `apps/forum` and `apps/frontpage`.
- Support **social login**, **email auth**, and later **SSO** / **org policies** if needed.
- Provide a clean path to **RBAC** (admin/mod/user) that is enforceable in Convex mutations and API routes.

### Proposed Approach (recommended)
- Use **WorkOS AuthKit** for user sign-in/sign-up and session management.
- Treat WorkOS as the **OIDC identity provider** for Convex (Convex supports WorkOS AuthKit as a third-party provider).
- Keep Convex as the source of truth for application data and enforce authorization in Convex functions.

## High-Level Refactor Steps

### Phase 0 — Prep & Decisions
- Decide whether the app uses:
  - **WorkOS roles** (WorkOS RBAC product),
  - or **app-local roles** stored in Convex `users.role` (current schema hints at this).

**Recommendation:** start with **app-local roles in Convex** (`users.role = user|admin|mod`) because it’s simpler and keeps authorization close to data. WorkOS RBAC can be added later if you need centralized permissioning across multiple services.

### Phase 1 — Configure WorkOS
1. Create a WorkOS project (staging + production).
2. Enable AuthKit in the WorkOS dashboard.
3. Configure:
   - Redirect URI (e.g. `http://localhost:3000/auth/callback` and `http://localhost:3001/auth/callback`).
   - Sign-in endpoint (e.g. `http://localhost:4000/auth/login` or per-app sign-in endpoints).
   - Sign-out redirect.
4. Collect secrets:
   - WorkOS **API key**
   - WorkOS **Client ID**
   - A strong **session encryption password** (WorkOS docs require 32 chars for their session helpers)

## Phase 2 — Implement Auth Endpoints (Server)

### Option A (preferred): implement in `packages/api` (Hono)
Add server endpoints responsible for:
- `GET /auth/login` → redirects to WorkOS AuthKit authorization URL.
- `GET /auth/callback` → exchanges auth code for WorkOS user + session, then sets a secure cookie.
- `POST/GET /auth/logout` → clears cookie and/or redirects to WorkOS logout URL.

Why here:
- Both apps already rely on `packages/api` and it’s the natural shared backend for browser flows.

### Option B: implement per app (TanStack Start routes)
Implement the same endpoints inside each app to avoid cross-domain cookie issues, but duplicate logic.

### Cookie/session strategy
- Use **httpOnly secure cookies** issued by the server.
- Keep cookie domain strategy compatible with local dev (localhost) and production (single apex domain preferred).

## Phase 3 — Make Convex Trust WorkOS Tokens

Convex supports third-party auth providers via OIDC tokens (JWTs). For WorkOS AuthKit, follow Convex’s WorkOS AuthKit integration guidance.

Implementation outline:
1. Add/adjust `convex/auth.config.ts` in `packages/db/convex/` to trust WorkOS as an issuer (OIDC provider).
2. Ensure the browser Convex client sends the **ID token** (or access token as required) when calling Convex.

Key requirement from Convex custom auth:
- `domain` must match JWT `iss`
- `applicationID` must match JWT `aud`

Source (Convex custom provider rules): https://docs.convex.dev/auth/custom-auth

## Phase 4 — Frontend Integration (SolidJS)

### Replace placeholder UI
- Replace `isLoggedIn = false` in `packages/ui/Header.tsx`.
- Replace placeholder `Login` component with:
  - a “Sign in” button that navigates to `/auth/login`.
  - a “Sign out” button that calls `/auth/logout`.

### Add shared auth primitives in `@forum/ui`
Create a minimal shared surface area:
- `useSession()` → `{ isLoading, isAuthenticated, user }`
- `AuthProvider` → ensures Convex client is configured with token injection.

Note: Convex provides React helpers; for SolidJS you’ll likely implement token wiring manually. Keep this isolated in `packages/ui/src/components/auth/*` so both apps benefit.

### Add “current user” query
- Add a Convex query like `users.getMe` returning the DB user row for the authenticated subject.
- On first login, upsert the Convex `users` table with WorkOS user info (email, name, image).

## Phase 5 — Authorization Model (RBAC)

### Minimum viable RBAC
- Convex:
  - Add helper: `requireUser(ctx)` and `requireAdmin(ctx)`.
  - Enforce on all write mutations (create topic/post already requires login).
- API (Hono):
  - For any future write endpoints: verify session and map to permissions.

### Where to store roles
- Keep `users.role` in Convex (already exists as optional union of `user|admin`).
- Add `mod` role if moderation is planned.
- Add a safe “bootstrap admin” mechanism for the first user (env-based allowlist email) to avoid manual DB edits.

## Phase 6 — Migration / Cleanup

- Remove Convex Auth server wiring if no longer used:
  - `packages/db/convex/auth.ts`
  - `packages/db/convex/http.ts` routes provided by `@convex-dev/auth`
- Remove `@convex-dev/auth` dependencies from apps/packages.
- Update docs:
  - `.env.example` with WorkOS secrets and URLs.
  - README run instructions.

## Risks / Gotchas

- **Cookie domain + ports**: if `forum` and `frontpage` are on different subdomains/ports, decide whether auth cookie is shared (same site) or per app.
- **SSR vs client**: make sure token fetching works in SSR and doesn’t leak secrets.
- **Convex token format**: ensure you pass the correct WorkOS-issued token type expected by Convex (OIDC ID token).

## Milestones (Definition of Done)

1. User can click “Sign in”, complete WorkOS hosted auth, return authenticated.
2. Convex `getAuthUserId(ctx)` (or equivalent identity access) works and can upsert `users`.
3. `createTopic` and `createPost` succeed for authenticated users.
4. UI shows correct login state + user email/avatar.
5. Admin-only action sample (e.g., delete post) enforced server-side.
