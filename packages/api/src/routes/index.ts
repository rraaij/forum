import type { Hono } from "hono";
import type { AppEnv } from "../types";
import { adminRoutes } from "./admin";
import { authRoutes } from "./auth";
import { categoriesRoutes } from "./categories";
import { postsRoutes } from "./posts";
import { profileRoutes } from "./profile";
import { reactionsRoutes } from "./reactions";
import { topicsRoutes } from "./topics";
import { votesRoutes } from "./votes";

/*
 * Routes are CHAINED and the result returned so the accumulated Hono schema
 * reaches the exported AppType — hc<AppType> on the frontend derives its
 * transport types from it (refactor plan section 6.2). Registering routes as
 * separate statements would silently discard that type information.
 */
export function mountRoutes(app: Hono<AppEnv>) {
  return app
    .route("/api/auth", authRoutes)
    .route("/api/admin", adminRoutes)
    .route("/api/categories", categoriesRoutes)
    .route("/api/topics", topicsRoutes)
    .route("/api/posts", postsRoutes)
    .route("/api/profile", profileRoutes)
    .route("/api/reactions", reactionsRoutes)
    .route("/api/votes", votesRoutes);
}
