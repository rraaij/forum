import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware, type AuthEnv } from "./middleware/auth.js";
import categories from "./routes/categories.js";
import topics from "./routes/topics.js";
import posts from "./routes/posts.js";

const app = new Hono<AuthEnv>();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use("*", authMiddleware);

// Routes
app.route("/categories", categories);
app.route("/topics", topics);
app.route("/posts", posts);

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok", message: "Forum API Server" });
});

const port = 4000;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
