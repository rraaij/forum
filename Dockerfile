# Stage 1: Install dependencies
#
# pnpm is a Node tool, so the dependency and build stages use the Node image
# and Corepack, which reads the exact version from the root package.json
# "packageManager" field. The standalone installer from get.pnpm.io is
# glibc-only and segfaults on Alpine's musl. The runtime stage is still Bun.
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/forum/package.json ./apps/forum/
COPY packages/api/package.json ./packages/api/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

# Stage 2: Build the forum app
FROM node:22-alpine AS build
RUN corepack enable
# Non-interactive: pnpm otherwise refuses to reconcile node_modules without a
# TTY (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY).
ENV CI=true
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/forum/node_modules ./apps/forum/node_modules
COPY . .
# VITE_API_URL must be set at build time — it's inlined into the client bundle by Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @forum/forum-app build

# Stage 3: Production runtime
FROM oven/bun:1-alpine AS runtime
WORKDIR /app
COPY --from=build /app/apps/forum/.output ./.output
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "--bun", ".output/server/index.mjs"]
