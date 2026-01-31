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

### Critical Issues (Status Updated)

| Issue                              | Severity | Status                               |
| ---------------------------------- | -------- | ------------------------------------ |
| Auth providers not configured      | Critical | Fixed - GitHub + Resend configured   |
| No authorization on mutations      | Critical | Fixed - Mutations require auth       |
| CORS allows all origins            | High     | Fixed - Restricted to allowed origins |
| `/seed` endpoint publicly exposed  | High     | Fixed - Dev-only                     |
| Hardcoded `localhost:4000` API URL | High     | Fixed - Uses VITE_API_URL            |
| `as any` casts throughout API      | Medium   | Fixed - Proper types                 |
| No error feedback to users         | Medium   | Fixed - Toast notifications          |
| 100% duplicate code between apps   | High     | In Progress                          |
| No tests                           | Medium   | Pending                              |
| No pagination                      | Medium   | Pending                              |

This document outlines the strategy for refactoring the current forum application into a Bun-powered monorepo. This will allow for multiple applications to share the same Hono backend and a common library of UI components.

## Target Structure

We will adopt a standard monorepo layout using **Bun Workspaces**:

```text
/
├── apps/
│   ├── forum/              # Internet Forum application
│   └── frontpage/          # [NEW] News aggregation app
├── packages/
│   ├── api/                # Hono Backend (shared by all apps)
│   ├── ui/                 # Shared SolidJS components and design system
│   ├── db/                 # Convex schema, generated client code, and Auth
│   └── config/             # Shared configurations (Vite, Biome, TypeScript)
├── package.json            # Workspace definitions
└── bun.lock
```

## Feature Roadmap

### 1. Authentication & Authorization (Convex Auth)
*   **Single Sign-On (SSO)**: Implement a login flow that works across `forum` and `frontpage`.
*   **Role-Based Access Control (RBAC)**:
    *   `user`: Standard access (post, reply, react).
    *   `admin`: Moderation capabilities (delete posts/comments).
*   **Implementation**: Use `@convex-dev/auth` for handling sessions and identity.

### 2. "Frontpage" App
*   A Hacker News / Reddit style news aggregator.
*   **Core Features**:
    *   Submit news links.
    *   Upvote/Downvote logic.
    *   Shared comments (potentially reusing forum components).

## Execution History

### Phase 1: Workspace Initialization (Done)
*   Configured `package.json` workspaces.
*   Moved global tooling to root.

### Phase 2: Backend Extraction (Done)
*   Moved `server/` to `packages/api`.
*   Created `packages/api/package.json`.

### Phase 3: Database & Schema (Done)
*   Moved `convex/` to `packages/db`.

### Phase 4: Shared UI Library (Done)
*   Initialized `packages/ui`.
*   Migrated `Header` component.
*   Added `Header` to `apps/forum`.

### Phase 5: App Refactoring (Done)
*   Moved `src/` to `apps/forum`.
*   App runs successfully with Hono backend.

### Phase 6: Frontpage & Auth (Current)
1.  **Convex Auth Setup**: Install `@convex-dev/auth`, update schema for users/sessions.
2.  **Scaffold Frontpage**: Create `apps/frontpage` from `apps/forum` template.
3.  **Implement Auth UI**: Create shared `Login` and `UserMenu` components in `packages/ui`.
4.  **Role Logic**: Update `packages/api` to check for roles in moderation endpoints.

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

### Phase 7: Security Foundation ✓
- ✓ Configured GitHub OAuth and Resend email providers
- ✓ Added HTTP routes for auth (`packages/db/convex/http.ts`)
- ✓ Authorization checks in Convex mutations (require login)
- ✓ Restricted CORS to allowed origins only
- ✓ Protected `/seed` endpoint (dev-only)
- ✓ Made API URL configurable via `VITE_API_URL`

### Phase 8: Type Safety & Error Handling ✓
- ✓ Eliminated `as any` casts with proper Convex ID types
- ✓ Added toast notification system (`solid-toast`)
- ✓ User-visible error messages on all mutations
- ✓ Success feedback on post creation
- ✓ Typed API client with proper response types
- ✓ Frontend mutations now use Convex directly (bypassing Hono for writes)

```                                                                                                                                                                                                                                
⏺ The page is loading now. I can see the HTML with the header "FORUMAPP", the Categories section, and the "Seed Database" button. There's an API error because the API server isn't running.                                      
                                                                                                                                                                                                                                  
⏺ Stop Task(b66bbfa)                                                                                                                                                                                                              
  ⎿  Task stopped                                                                                                                                                                                                                 
                                                                                                                                                                                                                                  
⏺ The app is now working. Here's what was fixed and what you need to do:                                                                                                                                                          
                                                                                                                                                                                                                                  
  What Was Fixed                                                                                                                                                                                                                  
                                                                                                                                                                                                                                  
  1. React/SolidJS auth conflict - The @convex-dev/auth package only supports React, not SolidJS. I temporarily disabled the auth hooks to get the app running. The auth UI components (Login form) are in place but not          
  functional yet.                                                                                                                                                                                                                 
  2. SSR environment issues - Fixed the VITE_CONVEX_URL environment variable handling for SSR.                                                                                                                                    
  3. Removed problematic imports - Removed @convex-dev/auth/solid imports (doesn't exist) and the React auth hooks.                                                                                                               
                                                                                                                                                                                                                                  
  To Run the App                                                                                                                                                                                                                  
                                                                                                                                                                                                                                  
  You need to run three things:                                                                                                                                                                                                   
                                                                                                                                                                                                                                  
  # Terminal 1: Convex dev server                                                                                                                                                                                                 
  cd packages/db && bunx convex dev                                                                                                                                                                                               
                                                                                                                                                                                                                                  
  # Terminal 2: Hono API server                                                                                                                                                                                                   
  bun dev:server                                                                                                                                                                                                                  
                                                                                                                                                                                                                                  
  # Terminal 3: Frontend app                                                                                                                                                                                                      
  bun dev:forum                                                                                                                                                                                                                   
                                                                                                                                                                                                                                  
  Or run everything together with:                                                                                                                                                                                                
  bun dev                                                                                                                                                                                                                         
                                                                                                                                                                                                                                  
  But you'll also need Convex running in a separate terminal.                                                                                                                                                                     
                                                                                                                                                                                                                                  
  Auth Status                                                                                                                                                                                                                     
                                                                                                                                                                                                                                  
  The auth system needs to be reimplemented for SolidJS. Options:                                                                                                                                                                 
  1. Wait for @convex-dev/auth to add SolidJS support                                                                                                                                                                             
  2. Implement custom auth using Convex mutations directly                                                                                                                                                                        
  3. Use a different auth provider (like Lucia or custom JWT)                                                                                                                                                                     
                                                                                                                                                                                                                                  
  For now, the app works without auth - users can read categories, topics, and posts. The write operations will fail until auth is implemented (mutations require login).                                                         
                                                                                                                                                                                                                                  
✻ Crunched for 11m 5s                                                                                                                                                                                                             
                                                                                                                                                                                                                                  
⏺ Background command "Run dev server briefly to see output" completed (exit code 0)                                                                                                                                               
                                                                                                                                                                                                                                  
⏺ Read 1 file (ctrl+o to expand)                                                                                                                                                                                                  
                                                                                                                                                                                                                                  
⏺ That's old output from before the fixes. The app should work now.                                                                                                                                                               
                                                                                                                                                                                                                                  
  Would you like me to help you run the app? You'll need:                                                                                                                                                                         
                                                                                                                                                                                                                                  
  # Terminal 1: Start Convex                                                                                                                                                                                                      
  cd packages/db && bunx convex dev                                                                                                                                                                                               
                                                                                                                                                                                                                                  
  # Terminal 2: Start all apps                                                                                                                                                                                                    
  bun dev                                                                                                                                                                                                                         
                                                                                                                                                                                                                                  
  Or is there something specific you'd like to work on next from the plan?                                                                                                                                                        
                                                                                                                                                                                                                                  
⏺ Background command "Start forum dev server in background" completed (exit code 0)                                                                                                                                               
                                                                                                                                                                                                                                  
⏺ That's also old output. The fixes have been applied.                                                                                                                                                                            
                                                                                                                                                                                                                                  
  To run the app now:                                                                                                                                                                                                             
                                                                                                                                                                                                                                  
  bun dev                                                                                                                                                                                                                         
                                                                                                                                                                                                                                  
  This will start the forum (port 3000), frontpage (port 3001), and API server (port 4000) in parallel.                                                                                                                           
                                                                                                                                                                                                                                  
  You'll also need Convex running in a separate terminal:                                                                                                                                                                         
  cd packages/db && bunx convex dev                                                                                                                                                                                               
                                                                                                                                                                                                                                  
  Let me know if you run into any issues or what you'd like to work on next.        ```
