# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Bun-powered monorepo containing React forum applications with Vite + TanStack Router. Multiple apps share a common Hono backend and UI component library (shadcn/ui), with Convex as the database/auth backend.

## Commands

```bash
# Development (runs forum:3000, frontpage:3001, backend:4000 in parallel)
bun dev

# Individual apps
bun dev:forum       # Forum app only (port 3000)
bun dev:frontpage   # Frontpage app only (port 3001)
bun dev:backend     # Hono API server only (port 4000)
bun dev:convex      # Convex dev server (run in separate terminal)

# Build
bun build
bun build:forum
bun build:frontpage

# Linting & Formatting (Biome)
bun lint
bun format
bun check
```

## Architecture

```
apps/
├── forum/          # Main forum app (Vite + React + TanStack Router, port 3000)
└── frontpage/      # News aggregator app (Vite + React, port 3001)

packages/
├── backend/        # Hono REST server (port 4000)
├── convex/         # Convex schema, queries, mutations, auth
└── ui/             # Shared React components (shadcn/ui based)
```

**Data Flow**:
- Frontend apps → Convex directly via `useQuery`/`useMutation` from `convex/react`
- Backend provides REST API that can also call Convex (for server-side operations)

## Environment Variables

Required in `.env.local` (root, `packages/convex/`, and `packages/backend/`):
```bash
# Root and packages/convex
CONVEX_DEPLOYMENT=dev:blessed-sturgeon-374
CONVEX_URL=https://blessed-sturgeon-374.convex.cloud
VITE_CONVEX_URL=https://blessed-sturgeon-374.convex.cloud
CONVEX_SITE_URL=https://blessed-sturgeon-374.convex.site

# packages/backend (non-VITE_ prefix)
CONVEX_URL=https://blessed-sturgeon-374.convex.cloud
```

## Key Technical Details

- **Package Manager**: Bun (not npm/yarn)
- **Frontend**: React 18 with hooks - use `useState`, `useEffect`, `useMemo`
- **Build Tool**: Vite (fast dev server, HMR)
- **Routing**: TanStack Router with file-based routes in `src/routes/`
- **State**: Convex `useQuery` for reads, `useMutation` for writes
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Auth**: Convex Auth with Password provider
- **Backend**: Hono server with CORS for localhost:3000, 3001

## Package Imports

Use workspace aliases for cross-package imports:
- `@forum/ui` - Shared shadcn/ui components
- `@forum/backend` - Backend (not typically imported)
- `@forum/convex` - Convex package (not typically imported)

## Database (Convex)

Schema in `packages/convex/convex/schema.ts`:
- `users` - User accounts with roles ("user" | "admin")
- `categories` - Hierarchical categories (parentId for nesting)
- `topics` - Discussion threads in categories
- `posts` - Comments within topics

Queries/mutations split into:
- `categories.ts` - list, get, create
- `topics.ts` - listByCategory, get, create
- `posts.ts` - listByTopic, create
- `users.ts` - currentUser

## Auth Implementation

Using `@convex-dev/auth` with Password provider:
- Sign up/Sign in: Use `useAuthActions()` hook
- Current user: Use `useConvexAuth()` for auth state
- Protected mutations: Use `getAuthUserId(ctx)` in Convex functions

## Adding Features

- **New route**: Add `.tsx` file in `apps/{app}/src/routes/`
- **Shared component**: Add to `packages/ui/src/components/`, export from `packages/ui/src/index.ts`
- **API endpoint**: Add to `packages/backend/src/routes/`
- **DB operation**: Add to appropriate file in `packages/convex/convex/`

## Code Style

Biome handles formatting and linting. Key settings:
- 2-space indentation
- Double quotes for JS/JSX
- Semicolons required
- Trailing commas in arrays/objects
