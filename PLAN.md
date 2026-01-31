# Monorepo Refactoring Plan

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
