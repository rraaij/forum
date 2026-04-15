import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { sessionMiddleware } from "./middleware/session";
import { mountRoutes } from "./routes";
import type { AppEnv } from "./types";

export function createApp() {
  const app = new Hono<AppEnv>();

  // Middleware
  app.use(
    "*",
    cors({
      origin: process.env.APP_URL || "http://localhost:3001",
      credentials: true,
    }),
  );
  app.use("*", logger());
  app.use("/api/*", sessionMiddleware);

  // Routes
  mountRoutes(app);

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  return app;
}
