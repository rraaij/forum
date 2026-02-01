# Forum Monorepo Rebuild - React + TanStack Start + Hono

## Overview
Complete rebuild of the forum monorepo using modern React stack with proper separation of concerns. Backend connects to Convex, frontend apps use TanStack Start Server Functions to call backend endpoints.

## Tech Stack
- **Frontend Apps**: TanStack Start + React + TypeScript
- **UI Library**: shadcn/ui components
- **Backend**: Hono + TypeScript
- **Database**: Convex (existing deployment: blessed-sturgeon-374)
- **Auth**: Convex Auth with Password provider (following stuff-to-watch pattern)
- **Package Manager**: Bun
- **Monorepo**: Bun workspaces

## Project Structure
```
forum-monorepo/
├── apps/
│   ├── forum/              # Main forum app (port 3000)
│   │   ├── app/
│   │   │   ├── routes/
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── category.$id.tsx
│   │   │   │   └── topic.$id.tsx
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── server/
│   │   │       └── functions.ts    # Server Functions
│   │   ├── app.config.ts
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── frontpage/          # News aggregator (port 3001)
│       ├── app/
│       │   ├── routes/
│       │   │   ├── __root.tsx
│       │   │   └── index.tsx
│       │   ├── components/
│       │   ├── lib/
│       │   └── server/
│       │       └── functions.ts
│       ├── app.config.ts
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── backend/            # Hono API server
│   │   ├── src/
│   │   │   ├── index.ts    # Main Hono app
│   │   │   ├── routes/
│   │   │   │   ├── categories.ts
│   │   │   │   ├── topics.ts
│   │   │   │   └── posts.ts
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts
│   │   │   └── lib/
│   │   │       └── convex.ts    # Convex client
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                 # Shared shadcn/ui components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/     # shadcn components
│   │   │   │   ├── header.tsx
│   │   │   │   └── auth/
│   │   │   ├── lib/
│   │   │   │   └── utils.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── convex/             # Convex schema & functions
│       ├── schema.ts       # Keep existing schema
│       ├── auth.config.ts
│       ├── auth.ts
│       ├── http.ts
│       ├── users.ts
│       ├── categories.ts
│       ├── topics.ts
│       ├── posts.ts
│       └── _generated/     # Auto-generated
│
├── .env.local              # Shared env vars
├── package.json            # Root workspace config
├── bun.lockb
└── tsconfig.json           # Base TypeScript config
```

## Implementation Steps

### Phase 1: Project Setup & Cleanup
1. **Backup existing `.env.local`** - Contains Convex deployment credentials
2. **Delete current apps/** and **packages/api**, **packages/ui** directories
3. **Keep packages/db/** - Rename to `packages/convex/`
4. **Create new directory structure** as shown above
5. **Initialize root package.json** with Bun workspaces

### Phase 2: Backend Package Setup
1. **Create packages/backend/** with Hono server
2. **Install dependencies**:
   ```bash
   bun add hono @hono/node-server
   bun add convex @convex-dev/auth
   bun add -D @types/node typescript
   ```
3. **Create Convex client** (`src/lib/convex.ts`):
   - Initialize ConvexClient with CONVEX_URL from env
   - Export authenticated client instance
4. **Create auth middleware** (`src/middleware/auth.ts`):
   - Verify JWT tokens from frontend
   - Attach userId to context
5. **Implement API routes**:
   - `GET /categories` - List all categories
   - `GET /categories/:id` - Get category details
   - `GET /categories/:id/topics` - List topics in category
   - `GET /topics/:id` - Get topic with posts
   - `POST /topics` - Create topic (authenticated)
   - `POST /posts` - Create post (authenticated)
6. **Main Hono app** (`src/index.ts`):
   - Setup CORS for localhost:3000, 3001
   - Register routes
   - Export for `bun run` on port 4000

### Phase 3: Convex Package Setup
1. **Keep existing schema.ts** - Already using authTables pattern
2. **Create auth.config.ts** (following stuff-to-watch):
   ```typescript
   export default {
     providers: [{
       domain: process.env.CONVEX_SITE_URL,
       applicationID: "convex"
     }]
   };
   ```
3. **Create auth.ts**:
   ```typescript
   import { Password } from "@convex-dev/auth/providers/Password";
   import { convexAuth } from "@convex-dev/auth/server";
   export const { auth, signIn, signOut, store } = convexAuth({
     providers: [Password],
   });
   ```
4. **Update http.ts** to register auth routes:
   ```typescript
   import { auth } from "./auth";
   export default auth.addHttpRoutes(httpRouter());
   ```
5. **Create Convex functions**:
   - `users.ts` - currentUser query (from stuff-to-watch pattern)
   - `categories.ts` - listCategories, getCategory
   - `topics.ts` - listTopics, getTopic, createTopic
   - `posts.ts` - listPosts, createPost
6. **Add auth guards** to all mutations using `getAuthUserId(ctx)`

### Phase 4: UI Package Setup
1. **Initialize shadcn/ui**:
   ```bash
   cd packages/ui
   bun add react react-dom
   bun add -D @types/react @types/react-dom
   bun add tailwindcss postcss autoprefixer
   bun add class-variance-authority clsx tailwind-merge
   ```
2. **Setup shadcn CLI** and install base components:
   - Button, Card, Input, Form, Label
   - Dialog, DropdownMenu, Sheet (for mobile nav)
   - Toast/Sonner for notifications
3. **Create shared components**:
   - `Header.tsx` - Navigation with auth state
   - `auth/SignIn.tsx` - Email/password form
   - `auth/SignUp.tsx` - Registration form
   - `auth/UserMenu.tsx` - Dropdown with logout
4. **Export all components** from `src/index.ts`
5. **Configure Tailwind** with design tokens

### Phase 5: Forum App Setup
1. **Install TanStack Start**:
   ```bash
   cd apps/forum
   bun create @tanstack/start
   ```
2. **Install dependencies**:
   ```bash
   bun add @convex-dev/auth @convex-dev/react
   bun add @tanstack/react-router
   bun add convex @forum/ui
   ```
3. **Configure app.config.ts**:
   ```typescript
   import { defineConfig } from "@tanstack/start/config";
   export default defineConfig({
     server: { preset: "node-server", port: 3000 }
   });
   ```
4. **Setup ConvexAuthProvider** in `__root.tsx`:
   ```tsx
   import { ConvexAuthProvider } from "@convex-dev/auth/react";
   import { ConvexReactClient } from "convex/react";

   const convexClient = new ConvexReactClient(
     import.meta.env.VITE_CONVEX_URL
   );

   export const Route = createRootRoute({
     component: () => (
       <ConvexAuthProvider client={convexClient}>
         <Outlet />
       </ConvexAuthProvider>
     )
   });
   ```
5. **Create Server Functions** (`app/server/functions.ts`):
   ```typescript
   import { createServerFn } from "@tanstack/start";

   export const getCategories = createServerFn()
     .handler(async () => {
       const res = await fetch("http://localhost:4000/categories");
       return res.json();
     });

   export const getTopic = createServerFn()
     .validator((id: string) => id)
     .handler(async ({ data: id }) => {
       const res = await fetch(`http://localhost:4000/topics/${id}`);
       return res.json();
     });
   ```
6. **Implement routes**:
   - `index.tsx` - Category list with auth check
   - `category.$id.tsx` - Topics in category
   - `topic.$id.tsx` - Topic with posts + reply form
7. **Add auth hooks** from `@convex-dev/auth/react`:
   ```tsx
   import { useConvexAuth } from "@convex-dev/auth/react";
   const { isAuthenticated, isLoading } = useConvexAuth();
   ```

### Phase 6: Frontpage App Setup
1. **Mirror forum app structure** but simpler
2. **Same TanStack Start + Convex Auth setup**
3. **Routes**:
   - `index.tsx` - News feed (list of topics from all categories)
   - Link to topic detail (reuse topic.$id from forum)
4. **Server Functions** for fetching news feed
5. **Port 3001** configuration

### Phase 7: Auth Implementation
1. **Sign Up flow** (following stuff-to-watch):
   ```tsx
   import { useAuthActions } from "@convex-dev/auth/react";

   function SignUp() {
     const { signIn } = useAuthActions();
     const handleSubmit = async (e) => {
       e.preventDefault();
       const formData = new FormData(e.target);
       await signIn("password", formData);
     };
   }
   ```
2. **Sign In flow** - Same pattern
3. **Sign Out** - `signOut()` from useAuthActions
4. **Protected routes** - Check `isAuthenticated` in Server Functions
5. **Backend auth middleware** - Verify Convex session tokens

### Phase 8: Environment & Scripts
1. **Root .env.local** (copy from existing):
   ```bash
   CONVEX_DEPLOYMENT=dev:blessed-sturgeon-374
   CONVEX_URL=https://blessed-sturgeon-374.convex.cloud
   VITE_CONVEX_URL=https://blessed-sturgeon-374.convex.cloud
   CONVEX_SITE_URL=https://blessed-sturgeon-374.convex.site
   ```
2. **Backend .env** needs CONVEX_URL (not VITE_ prefixed)
3. **Root package.json scripts**:
   ```json
   {
     "scripts": {
       "dev:forum": "cd apps/forum && bun dev",
       "dev:frontpage": "cd apps/frontpage && bun dev",
       "dev:backend": "cd packages/backend && bun dev",
       "dev:convex": "cd packages/convex && bunx convex dev",
       "dev": "bun run dev:forum & bun run dev:frontpage & bun run dev:backend",
       "build": "bun run build:forum && bun run build:frontpage",
       "build:forum": "cd apps/forum && bun run build",
       "build:frontpage": "cd apps/frontpage && bun run build"
     }
   }
   ```

## Key Architectural Decisions

### 1. TanStack Start Server Functions vs Direct Convex
**Decision**: Use Server Functions to call Hono backend
**Rationale**:
- Backend becomes single source of truth for Convex connections
- Easier to add caching, rate limiting, logging at backend layer
- Server Functions provide type-safe RPC with minimal boilerplate
- Follows user's requested architecture

### 2. shadcn/ui vs Custom Components
**Decision**: Use shadcn/ui
**Rationale**:
- Copy-paste components = full control
- Built on Radix UI = accessible
- Tailwind-based = consistent styling
- Easy to customize/theme

### 3. Convex Auth Pattern (stuff-to-watch approach)
**Decision**: Use `@convex-dev/auth` with Password provider
**Rationale**:
- Simpler than manual JWT management
- Auto-handles session management
- Follows proven pattern from stuff-to-watch
- Easy to add OAuth later if needed

### 4. Monorepo Structure
**Decision**: Bun workspaces with separate apps/packages
**Rationale**:
- Clean separation of concerns
- Shared UI components via `@forum/ui`
- Type-safe imports via workspace protocol
- Each app can deploy independently

## Migration of Existing Data
- Convex schema stays the same (already uses authTables)
- Existing deployment (blessed-sturgeon-374) continues working
- No data migration needed
- Auth tables will be created on first auth setup

## Testing Strategy
1. **Manual testing**:
   - `bun dev` starts all servers
   - Forum app loads at localhost:3000
   - Frontpage loads at localhost:3001
   - Backend responds at localhost:4000
2. **Auth flow**:
   - Sign up new user
   - Sign in existing user
   - Create topic (authenticated)
   - Create post (authenticated)
3. **Data flow**:
   - Categories list loads
   - Topics in category display
   - Posts in topic show
4. **Cross-app navigation**:
   - Link from frontpage to forum topic works

## Critical Files to Create/Modify

### New Files (Complete Rebuild)
- Root: `package.json`, `tsconfig.json`, `.env.local` (keep existing)
- Backend: `packages/backend/src/index.ts`, `src/routes/*.ts`, `src/lib/convex.ts`
- Convex: `packages/convex/auth.config.ts`, `auth.ts`, `http.ts`, `*.ts` functions
- UI: `packages/ui/src/components/**/*.tsx`, `tailwind.config.ts`
- Forum: `apps/forum/app/routes/*.tsx`, `app/server/functions.ts`, `app.config.ts`
- Frontpage: `apps/frontpage/app/routes/*.tsx`, `app/server/functions.ts`

### Files to Keep
- `packages/convex/schema.ts` (current schema is good)
- `.env.local` (Convex deployment credentials)

## Verification Checklist
- [ ] `bun dev` starts forum, frontpage, and backend without errors
- [ ] Visit http://localhost:3000 shows forum app (not error page)
- [ ] Visit http://localhost:3001 shows frontpage app
- [ ] Backend responds: `curl http://localhost:4000/categories`
- [ ] Sign up creates user in Convex
- [ ] Sign in works and shows user menu
- [ ] Creating topic requires authentication
- [ ] Posts display correctly in topics
- [ ] Navigation between apps works
- [ ] No SSR errors in console
- [ ] All TypeScript compiles without errors

## Success Criteria
✅ All three servers run without errors
✅ No SSR/client-side API conflicts
✅ Auth works end-to-end (signup, signin, signout)
✅ Forum CRUD operations functional
✅ Type-safe across entire monorepo
✅ Clean, maintainable architecture following modern patterns
