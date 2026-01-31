# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Bun-powered monorepo containing a SolidJS forum application with TanStack Start. Multiple apps share a common Hono backend and UI component library, with Convex as the database/auth backend.

## Commands

```bash
# Development (runs forum:3000, frontpage:3001, api:4000 in parallel)
bun dev

# Individual apps
bun dev:forum       # Forum app only
bun dev:frontpage   # Frontpage app only
bun dev:server      # Hono API server only

# Convex (run in separate terminal from packages/db)
cd packages/db && bunx convex dev

# Build
bun build

# Linting & Formatting (Biome)
bun lint            # Check for issues
bun format          # Format files
bun check           # Check and auto-fix
```

## Architecture

```
apps/
├── forum/          # Main forum app (SolidJS + TanStack Start, port 3000)
└── frontpage/      # News aggregator app (port 3001)

packages/
├── api/            # Hono REST server (port 4000)
├── db/             # Convex schema, queries, mutations, auth
└── ui/             # Shared SolidJS components (Header, Login, AuthProvider)
```

**Data Flow**:
- Reads: Frontend → `forumApi` client → Hono server → Convex
- Writes: Frontend → Convex directly (via `useMutation` from `convex-solidjs`)

## Environment Variables

Required in `.env.local` (root and `packages/db/`):
```bash
CONVEX_DEPLOYMENT=dev:your-deployment
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# For production API
VITE_API_URL=https://your-api.example.com  # defaults to localhost:4000

# Auth providers (set in Convex dashboard)
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_RESEND_KEY=...
```

## Key Technical Details

- **Package Manager**: Bun (not npm/yarn)
- **Frontend**: SolidJS with signals (not React hooks) - use `createSignal`, `createEffect`, `createMemo`
- **Routing**: TanStack Router with file-based routes in `src/routes/`. The `routeTree.gen.ts` is auto-generated (don't edit)
- **State**: TanStack Query (`createQuery`) for reads, Convex `useMutation` for writes
- **Styling**: Tailwind CSS v4 + DaisyUI components
- **Auth**: Convex Auth with GitHub OAuth and Resend email magic links
- **Toasts**: Use `showSuccess`, `showError`, `showInfo` from `@forum/ui` for user feedback

## Package Imports

Use workspace aliases for cross-package imports:
- `@forum/ui` - Shared components
- `@forum/api` - API client and types
- `@forum/db` - Convex client (typically through api package)

## Database (Convex)

Schema in `packages/db/convex/schema.ts`:
- `users` - User accounts with roles ("user" | "admin")
- `categories` - Hierarchical categories (parentId for nesting)
- `topics` - Discussion threads in categories
- `posts` - Comments within topics

Queries/mutations in `packages/db/convex/forum.ts` and `users.ts`.

## Adding Features

- **New route**: Add `.tsx` file in `apps/{app}/src/routes/`
- **Shared component**: Add to `packages/ui/src/components/`, export from `packages/ui/src/index.ts`
- **API endpoint**: Add to `packages/api/index.ts`
- **DB operation**: Add to `packages/db/convex/forum.ts` or create new file

## Code Style

Biome handles formatting and linting. Key settings:
- 2-space indentation
- Double quotes for JS/JSX
- Semicolons required
- Trailing commas in arrays/objects