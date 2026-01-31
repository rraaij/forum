# Monorepo Refactoring Plan

This document outlines the strategy for refactoring the current forum application into a Bun-powered monorepo. This will allow for multiple applications to share the same Hono backend and a common library of UI components.

## Target Structure

We will adopt a standard monorepo layout using **Bun Workspaces**:

```text
/
├── apps/
│   └── forum/              # Original Forum application (SolidJS + TanStack Start)
├── packages/
│   ├── api/                # Hono Backend (shared by all apps)
│   ├── ui/                 # Shared SolidJS components and design system
│   ├── db/                 # Convex schema and generated client code
│   └── config/             # Shared configurations (Vite, Biome, TypeScript)
├── package.json            # Workspace definitions
└── bun.lock
```

## Step-by-Step Execution phases

### Phase 1: Workspace Initialization
1.  **Configure `package.json`**: Define workspaces in the root `package.json` using the `"workspaces": ["apps/*", "packages/*"]` field.
2.  **Global Tooling**: Move `biome.json` and base `tsconfig.json` to the root for shared linting and type safety.

### Phase 2: Backend Extraction (`packages/api`)
1.  Move the `server/` directory into `packages/api`.
2.  Setup a standalone `package.json` for the Hono server.
3.  Ensure environment variable handling works across the monorepo root.

### Phase 3: Database & Schema (`packages/db`)
1.  Move the `convex/` directory to `packages/db`.
2.  This allows both the Hono backend (`packages/api`) and any future deployment tools to share the same source of truth for the database schema.

### Phase 4: Shared UI Library (`packages/ui`)
1.  Initialize `packages/ui` as a SolidJS+Tailwind library.
2.  **Aesthetics Migration**: Extract the core "Internet Forum" aesthetic (colors, typography, Tailwind theme) from `styles.css` into a shared configuration.
3.  **Component Migration**: Move generic components like `Header.tsx` and recurring UI patterns (Cards, Buttons, Inputs) into this package.

### Phase 5: App Refactoring (`apps/forum`)
1.  Move the current `src/`, `public/`, and Vite configuration into `apps/forum`.
2.  Update imports to use workspace dependencies:
    *   `import { forumApi } from "@forum/api"`
    *   `import { Button } from "@forum/ui"`
3.  Clean up the app-level `package.json` to only contain app-specific dependencies.

### Phase 6: Orchestration & DX
1.  Create root-level scripts to run the entire stack:
    *   `bun dev`: Starts Convex, Hono, and all active apps.
    *   `bun build`: Builds all packages and apps in the correct order.

## Technical Considerations

*   **Tailwind 4 + DaisyUI**: We will maintain the current styling stack, ensuring `packages/ui` exports the necessary CSS for the apps to consume.
*   **Type Safety**: Use TypeScript project references to ensure `apps/forum` accurately reflects changes made in `packages/api` or `packages/ui`.
*   **Environment Variables**: Centralize `.env.local` at the root, using a shared utility to validate them across different environments (Hono vs. Vite).
