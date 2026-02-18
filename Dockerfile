# Stage 1: Install dependencies
FROM oven/bun:1-alpine AS deps
RUN apk add --no-cache curl && \
    curl -fsSL https://get.pnpm.io/install.sh | PNPM_VERSION=10.29.3 sh - && \
    ln -s /root/.local/share/pnpm/pnpm /usr/local/bin/pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/forum/package.json ./apps/forum/
COPY packages/api/package.json ./packages/api/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

# Stage 2: Build the forum app
FROM oven/bun:1-alpine AS build
RUN apk add --no-cache curl && \
    curl -fsSL https://get.pnpm.io/install.sh | PNPM_VERSION=10.29.3 sh - && \
    ln -s /root/.local/share/pnpm/pnpm /usr/local/bin/pnpm
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
EXPOSE 3001
CMD ["bun", "--bun", ".output/server/index.mjs"]
