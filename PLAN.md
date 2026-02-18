# Monorepo Refactoring Plan

This document outlines the strategy for refactoring the current forum application into a Turborepo-powered monorepo. 
This will allow for multiple applications to share the same Hono backend and a common library of UI components.

## Target Structure

We will adopt a standard monorepo layout using **Turborepo**:

```text
/
├── apps/
│   ├── forum/              # Internet Forum application: SolidJS/SolidStart
│   ├── frontpage/          # News aggregation app: SolidJS/SolidStart
│   ├── profile/            # Public available User Profile with reactions: SolidJS
│   └── dm/                 # Direct messaging: SolidJS
├── packages/
│   ├── api/                # Hono Backend (shared by all apps)
│   ├── ui/                 # Shared SolidJS components and design system, use Daisy UI for Component Library
│   ├── db/                 # Database schema, generated client code, and Auth
│   └── config/             # Shared configurations (Vite, Biome, TypeScript)
├── package.json            # Workspace definitions
└── turbo.json              # Turborepo configuration
```

## Feature Roadmap

### 1. Authentication & Authorization (Better Auth)
*   **Single Sign-On (SSO)**: Implement a login flow that works across `forum` and `frontpage`.
*   **Role-Based Access Control (RBAC)**:
    *   `user`: Standard access (post, reply, react).
    *   `admin`: Moderation capabilities (delete posts/comments).
*   **Implementation**: Use `Better-auth` for handling sessions and identity.

### 2. "Frontpage" App
*   A News aggregator. using API endpoint from GNews.io (https://gnews.io/dashboard, https://docs.gnews.io/endpoints/top-headlines-endpoint, API Key efdcfde4f323107ee4c6a248be3ba313)
*   **Core Features**:
    *   Comments on news articles, only when authed (potentially reusing forum components).
    *   Upvote/Downvote logic.
    *   Think about what to save to DB, maybe only the comments and votes, not the news articles themselves.
*   **Implementation**: SolidJS, Typescript, TailwindCSS, DaisyUI.

### 2. "Forum" App
*   Categories / Subcategories / Topics / Posts
*   **Core Features**:
    *   'Lurking' mode: Allow users to read content without logging in, but require authentication for posting or reacting.
    *   React to other posts (with emojis).
    *   Upvote/Downvote logic.
*   **Implementation**: SolidJS, SolidStart (many routes for Categories / Subcategories / Topics), Typescript, TailwindCSS, DaisyUI.

### 2. "Profile" App
*   Display user information, photos, posts, and reactions.
*   **Core Features**:
    *   Only available when authed. Users can view their own profile and other users' profiles.
    *   Allow users to edit their profile information and settings for Forum and Frontpage.
    *   Other users can react directly to user, visible to all users (with emojis).
*   **Implementation**: SolidJS, Typescript, TailwindCSS, DaisyUI.

### 2. "Direct Messaging" App
*   Other users can send DMs (with emojis), with read receipts and typing indicators.
*   **Core Features**:
    *   Only available when authed.
    *   Other users can react directly to user, only visible to authed user.
*   **Implementation**: SolidJS, Typescript, TailwindCSS, DaisyUI. Use WebSocket tech for real-time messaging.
