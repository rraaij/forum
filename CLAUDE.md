# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An internet forum platform being built as a Turborepo monorepo. See `PLAN.md` for the full feature roadmap and target architecture.

## Target Monorepo Structure

```
apps/
  forum/       # Internet forum (SolidJS/SolidStart) — Categories > Subcategories > Topics > Posts
  frontpage/   # News aggregator with comments/votes (SolidJS/SolidStart), GNews.io API
  profile/     # User profiles and settings (SolidJS)
  dm/          # Real-time direct messaging via WebSockets (SolidJS)
packages/
  api/         # Shared Hono backend
  ui/          # Shared SolidJS components — DaisyUI component library
  db/          # Drizzle schema, Convex client, Better Auth
  config/      # Shared Vite, Biome, TypeScript configs
```

## Stack

- **Frontend**: SolidJS, TanStack Router/Start, TypeScript, TailwindCSS, DaisyUI
- **Backend**: Bun, Hono (shared across apps in `packages/api`)
- **Database/Auth**: Convex DB, Better Auth (SSO across all apps)
- **Monorepo**: Turborepo, pnpm workspaces

## Commands

All commands use `bun --bun` prefix to ensure Bun's runtime is used (not Node):

```bash
bun install           # Install all workspace dependencies
bun --bun run dev     # Start dev server (run from app directory or root)
bun --bun run build   # Build for production
bun --bun run lint    # Lint with Biome
bun --bun run format  # Format with Biome
bun --bun run check   # Lint + format check (run after significant changes)
```

For Convex:
```bash
npx convex dev        # Start Convex dev backend (requires VITE_CONVEX_URL + CONVEX_DEPLOYMENT in .env.local)
```

## Biome Configuration

Defined at repo root `biome.json` — applies to all apps and packages:
- 2-space indent, LF, 80-char line width
- Double quotes, trailing commas, semicolons always
- `noExplicitAny` and `noArrayIndexKey` are disabled
- Excludes: `routeTree.gen.ts`, `convex/_generated/`, `.output/`, `.tanstack/`

## TypeScript

Root `tsconfig.json` applies globally:
- `jsxImportSource: "solid-js"` — SolidJS JSX transform (not React)
- Strict mode with `noUnusedLocals` and `noUnusedParameters`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports

## Routing

TanStack Router with file-based routing. Routes live in `src/routes/` per app. `__root.tsx` is the layout. `routeTree.gen.ts` is auto-generated — do not edit.

## Authentication

Better Auth handles SSO across all apps. Auth logic lives in `packages/db`. Both `forum` and `frontpage` share the same session/identity.

## Environment Variables

Use T3Env for type-safe env access (`src/env.mjs` per app). Access via `import { env } from "@/env"`. `.env.local` is gitignored.