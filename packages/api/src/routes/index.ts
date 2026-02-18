import type { Hono } from "hono";
import type { AppEnv } from "../types";
import { adminRoutes } from "./admin";
import { authRoutes } from "./auth";
import { categoriesRoutes } from "./categories";
import { postsRoutes } from "./posts";
import { reactionsRoutes } from "./reactions";
import { topicsRoutes } from "./topics";
import { votesRoutes } from "./votes";

export function mountRoutes(app: Hono<AppEnv>) {
  app.route("/api/auth", authRoutes);
  app.route("/api/admin", adminRoutes);
  app.route("/api/categories", categoriesRoutes);
  app.route("/api/topics", topicsRoutes);
  app.route("/api/posts", postsRoutes);
  app.route("/api/reactions", reactionsRoutes);
  app.route("/api/votes", votesRoutes);
}
