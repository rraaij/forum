# Forum Monorepo - Development Plan

This document outlines the technical assessment, improvement roadmap, and feature plan for the forum monorepo.

---

## Current State Assessment

### What's Working
- Monorepo structure with Bun workspaces
- Basic CRUD for categories, topics, posts via Hono API
- SolidJS + TanStack Start frontend apps
- Convex database with schema defined
- Shared UI package with Header, Login components
- Biome linting/formatting configured

### Critical Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Auth providers not configured | Critical | Login completely non-functional |
| No authorization on mutations | Critical | Anyone can create posts as any user |
| CORS allows all origins | High | Security vulnerability |
| `/seed` endpoint publicly exposed | High | Anyone can reset database |
| Hardcoded `localhost:4000` API URL | High | Breaks in any deployed environment |
| 100% duplicate code between apps | High | Maintenance nightmare |
| `as any` casts throughout API | Medium | Type safety undermined |
| No error feedback to users | Medium | Silent failures |
| No tests | Medium | Regressions likely |
| No pagination | Medium | Performance degrades at scale |

---

## Architecture Improvements

### Phase 1: Security Foundation (Priority: Immediate)

#### 1.1 Configure Authentication
- Add OAuth providers (GitHub, Google) to `packages/db/convex/auth.ts`
- Configure Resend for email magic links
- Set up proper session management
- Test auth flow end-to-end

#### 1.2 Add Authorization to Mutations
- Replace hardcoded `authorId: "anonymous"` with authenticated user ID
- Validate `authorId` matches current session in Convex mutations
- Add `ctx.auth.getUserIdentity()` checks to all write operations

#### 1.3 Secure API Layer
```typescript
// packages/api/index.ts
app.use("/*", cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));
```

#### 1.4 Protect/Remove Seed Endpoint
- Gate behind `NODE_ENV === "development"` check
- Or require admin authentication
- Consider moving to a CLI script instead

### Phase 2: Type Safety & Error Handling

#### 2.1 Eliminate `as any` Casts
Create proper Convex ID type handling:
```typescript
// packages/api/src/types.ts
import { Id } from "@forum/db/convex/_generated/dataModel";

// Use Zod with custom refinements for Convex IDs
const convexId = <T extends string>(table: T) =>
  z.string().refine((s): s is Id<T> => s.startsWith(""));
```

#### 2.2 Centralized Error Handling
- Create `packages/ui/src/components/ErrorBoundary.tsx`
- Add toast notification system (e.g., solid-toast)
- Replace `console.error` with user-visible feedback
- Add error states to all queries/mutations

#### 2.3 API Error Responses
```typescript
// Structured error responses from Hono
app.onError((err, c) => {
  return c.json({
    error: err.message,
    code: err.code ?? "INTERNAL_ERROR"
  }, err.status ?? 500);
});
```

### Phase 3: Code Deduplication

#### 3.1 Extract Shared Route Components
Move duplicate route logic to `packages/ui`:
- `CategoryPage` component (currently duplicated in both apps)
- `TopicPage` component (currently duplicated in both apps)
- `HomePage` base component

#### 3.2 Create App-Specific Wrappers
Each app imports shared components and customizes:
```typescript
// apps/forum/src/routes/category.$categoryId.tsx
import { CategoryPage } from "@forum/ui";
export const Route = createFileRoute("/category/$categoryId")({
  component: () => <CategoryPage variant="forum" />,
});
```

#### 3.3 Shared Layout Wrapper
Create `<AppShell>` component that handles:
- AuthProvider wrapping
- Header with navigation
- Error boundaries
- Loading states

### Phase 4: Performance Optimization

#### 4.1 Configure TanStack Query
```typescript
// packages/ui/src/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

#### 4.2 Add Pagination
- Add `cursor` and `limit` params to list queries
- Create `usePaginatedQuery` hook
- Implement infinite scroll or page-based UI

#### 4.3 Batch Related Queries
Create combined endpoints:
```typescript
// GET /categories/:id/full
// Returns: { category, subcategories, topics, topicCount }
```

#### 4.4 Environment-Based API URL
```typescript
// packages/api/src/client.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
```

### Phase 5: Developer Experience

#### 5.1 Add Test Infrastructure
- Install Vitest for unit tests
- Add Playwright for E2E tests
- Create test scripts in root `package.json`:
  ```json
  "test": "vitest",
  "test:e2e": "playwright test"
  ```

#### 5.2 Input Validation
Add length constraints to schema:
```typescript
// packages/db/convex/schema.ts
title: v.string(), // Add validators in mutations
// Mutation should check: title.length >= 3 && title.length <= 200
```

#### 5.3 Improved Scripts
```json
{
  "dev": "bun run --parallel dev:forum dev:frontpage dev:server dev:convex",
  "dev:convex": "bun run --cwd packages/db convex dev",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

## Feature Roadmap

### Near-Term Features

#### User Profiles
- Profile page showing user's posts and topics
- Avatar upload (store in Convex file storage)
- Bio and display name editing
- Activity history

#### Real-Time Updates
- Use Convex subscriptions for live topic updates
- Show "new posts" indicator without refresh
- Typing indicators in topic view

#### Rich Text Editor
- Replace plain textarea with TipTap or similar
- Markdown support
- Code syntax highlighting
- Image embedding

#### Search
- Full-text search across topics and posts
- Filter by category, date, author
- Search suggestions/autocomplete

### Medium-Term Features

#### Notifications
- In-app notification bell
- Email notifications for replies
- Configurable notification preferences
- Push notifications (web push)

#### Moderation Tools
- Report post/topic functionality
- Admin dashboard for reviewing reports
- Soft delete with audit trail
- User warnings and bans
- Content filtering

#### Voting/Reactions
- Upvote/downvote on posts (for Frontpage app)
- Emoji reactions on posts
- Sort by popularity

#### Categories Management
- Admin UI for creating/editing categories
- Drag-and-drop reordering
- Category icons and colors

### Long-Term Features

#### Mobile Apps
- React Native or Tauri mobile apps
- Push notifications
- Offline reading mode

#### API Documentation
- OpenAPI/Swagger spec generation
- Interactive API explorer
- Rate limiting documentation

#### Analytics Dashboard
- Post/topic activity graphs
- User engagement metrics
- Popular categories/topics
- Admin-only access

#### Federation/Multi-Tenancy
- Support multiple forum instances
- Cross-instance user accounts
- Shared moderation tools

---

## Technical Debt Cleanup

### Immediate Cleanup
- [ ] Remove hardcoded `"anonymous"` author IDs
- [ ] Remove hardcoded placeholder data in Frontpage (`128 points`, `42 comments`)
- [ ] Fix TODO comment about "all" category backend support
- [ ] Add proper `.gitignore` for `.env.local` files

### Schema Improvements
- [ ] Change `authorId: v.string()` to `authorId: v.id("users")` for referential integrity
- [ ] Add `updatedAt` timestamp to posts and topics
- [ ] Add `isDeleted` soft delete flag
- [ ] Add `viewCount` to topics

### Code Quality
- [ ] Add SEO metadata to root layouts (title, description, OG tags)
- [ ] Centralize query keys in a constants file
- [ ] Create shared Tailwind/DaisyUI theme configuration
- [ ] Add loading skeletons instead of spinners

---

## Execution Order

### Week 1: Security & Stability
1. Configure auth providers (GitHub OAuth)
2. Add authorization to Convex mutations
3. Fix CORS and protect seed endpoint
4. Make API URL configurable

### Week 2: Code Quality
1. Eliminate `as any` casts
2. Add error handling with toasts
3. Extract duplicate routes to shared package
4. Configure QueryClient properly

### Week 3: Testing & DX
1. Set up Vitest
2. Add unit tests for API endpoints
3. Add E2E tests for auth flow
4. Improve dev scripts and documentation

### Week 4: Features
1. User profiles
2. Real-time updates with Convex subscriptions
3. Pagination
4. Search (basic)

---

## Completed Phases (History)

### Phase 1: Workspace Initialization ✓
- Configured `package.json` workspaces
- Moved global tooling to root

### Phase 2: Backend Extraction ✓
- Moved `server/` to `packages/api`
- Created `packages/api/package.json`

### Phase 3: Database & Schema ✓
- Moved `convex/` to `packages/db`

### Phase 4: Shared UI Library ✓
- Initialized `packages/ui`
- Migrated `Header` component
- Added `Header` to `apps/forum`

### Phase 5: App Refactoring ✓
- Moved `src/` to `apps/forum`
- App runs successfully with Hono backend

### Phase 6: Frontpage & Auth (Partial)
- ✓ Scaffolded Frontpage app
- ✓ Created Login and UserMenu components
- ✗ Auth providers not configured
- ✗ Role-based access not implemented