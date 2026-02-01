# Forum Monorepo Rebuild - Implementation Status

## ✅ Completed

### Phase 1: Project Setup & Cleanup
- [x] Backed up .env.local with Convex credentials
- [x] Deleted old apps/ directories (forum, frontpage)
- [x] Deleted old packages (api, ui)
- [x] Renamed packages/db to packages/convex

### Phase 2: Backend Package (Hono)
- [x] Created packages/backend directory structure
- [x] Installed Hono, @hono/node-server, convex dependencies
- [x] Created Convex client (src/lib/convex.ts)
- [x] Created auth middleware (src/middleware/auth.ts)
- [x] Implemented API routes:
  - categories.ts (GET /, GET /:id, GET /:id/topics)
  - topics.ts (GET /:id, POST /)
  - posts.ts (GET /topic/:topicId, POST /)
- [x] Main Hono app with CORS, logging, port 4000

### Phase 3: Convex Package
- [x] Updated auth.ts to use Password provider
- [x] Created auth.config.ts
- [x] http.ts already configured with auth routes
- [x] Updated users.ts (renamed viewer → currentUser)

### Phase 4: Convex Functions
- [x] Split forum.ts into separate files:
  - categories.ts (list, get, create)
  - topics.ts (listByCategory, get, create)
  - posts.ts (listByTopic, create)
- [x] All mutations use getAuthUserId for auth guards

### Phase 5: UI Package (shadcn/ui)
- [x] Created packages/ui with React + TypeScript
- [x] Installed shadcn/ui dependencies
- [x] Configured Tailwind CSS v4
- [x] Created base components:
  - Button, Card, Input, Label
- [x] Created shared components:
  - Header (with auth state)
  - SignIn form
  - SignUp form
- [x] Exported all components from src/index.ts

### Phase 6: Forum App (TanStack Start)
- [x] Created apps/forum with TanStack Start structure
- [x] Configured app.config.ts (port 3000)
- [x] Setup ConvexAuthProvider in __root.tsx
- [x] Implemented routes:
  - index.tsx (category list)
  - category.$id.tsx (topics in category)
  - topic.$id.tsx (topic with posts)
- [x] Installed dependencies

### Phase 7: Frontpage App
- [x] Created apps/frontpage (port 3001)
- [x] Same TanStack Start + Convex Auth setup
- [x] Implemented index.tsx (news feed of all topics)
- [x] Links to forum for topic details
- [x] Installed dependencies

### Phase 8: Scripts & Environment
- [x] Updated root package.json scripts:
  - dev:forum, dev:frontpage, dev:backend, dev:convex
  - dev (runs all in parallel)
  - build, build:forum, build:frontpage
- [x] Created .env.local files in all necessary locations
- [x] Updated CLAUDE.md with new architecture

## ✅ Vite Rebuild Complete!

Successfully rebuilt both apps with **Vite + React + TanStack Router** (stable, no more TanStack Start issues):
- [x] Removed TanStack Start apps
- [x] Created Vite-based React apps with TanStack Router
- [x] Configured proper routing with file-based routes
- [x] Set up Convex integration
- [x] All workspace dependencies linked correctly

## 🚧 Remaining Work

### Authentication Implementation (Phase 7 - Partial)
- [ ] Create auth routes in forum app:
  - /auth/signin route
  - /auth/signup route
- [ ] Wire up SignIn component with useAuthActions
- [ ] Wire up SignUp component with useAuthActions
- [ ] Implement signOut functionality in Header
- [ ] Add protected route checks

### Testing & Debugging (Phase 8 - Task #12)
- [ ] Start Convex dev server: `cd packages/convex && bunx convex dev`
- [ ] Seed initial data (run seed mutation if needed)
- [ ] Test `bun dev` starts all servers
- [ ] Verify forum loads at localhost:3000
- [ ] Verify frontpage loads at localhost:3001
- [ ] Verify backend responds at localhost:4000
- [ ] Test auth flow (signup, signin, signout)
- [ ] Test creating topics (authenticated)
- [ ] Test creating posts (authenticated)
- [ ] Fix any TypeScript/build errors
- [ ] Fix any SSR/hydration issues

### Known Issues to Address
1. **API paths in backend routes**: Currently hardcoded as `../../../convex/convex/_generated/api.js` - may need adjustment
2. **Auth routes missing**: Need to create /auth/signin and /auth/signup routes
3. **Form submissions**: SignIn/SignUp components need to be wired up with actual auth actions
4. **Error handling**: Need to add proper error boundaries and toast notifications
5. **Loading states**: May need better loading indicators
6. **Seed data**: Need to run seed mutation or manually create initial categories

## Next Steps

1. **Start Convex Dev Server** (required first):
   ```bash
   cd packages/convex
   bunx convex dev
   ```

2. **Seed Initial Data** (if database is empty):
   - Open Convex dashboard
   - Run the `seed` mutation from old forum.ts (if categories don't exist)

3. **Implement Auth Routes**:
   - Create `apps/forum/app/routes/auth/signin.tsx`
   - Create `apps/forum/app/routes/auth/signup.tsx`
   - Wire up with `useAuthActions()` from `@convex-dev/auth/react`

4. **Test the Application**:
   ```bash
   bun dev
   ```
   Then visit:
   - http://localhost:3000 (forum)
   - http://localhost:3001 (frontpage)
   - http://localhost:4000 (backend health check)

5. **Debug and Fix Issues** as they arise

## Architecture Notes

- Frontend apps connect **directly to Convex** (not through backend)
- Backend is available for server-side operations if needed
- TanStack Start provides SSR capabilities
- Auth is handled by Convex Auth with Password provider
