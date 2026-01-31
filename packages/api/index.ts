import { ConvexClient } from "convex/browser";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "../db/convex/_generated/api";
import type { Id } from "../db/convex/_generated/dataModel";

const app = new Hono();

// Environment
const isDev = Bun.env.NODE_ENV !== "production";
const allowedOrigins = Bun.env.ALLOWED_ORIGINS?.split(",") ?? [
  "http://localhost:3000",
  "http://localhost:3001",
];

// Middleware - Restrict CORS to allowed origins
app.use(
  "/*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Convex Client
const convexUrl = Bun.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("VITE_CONVEX_URL is not defined");
const convex = new ConvexClient(convexUrl);

// --- Categories (Read-only, public) ---

app.get("/categories", async (c) => {
  const parentIdParam = c.req.query("parentId");
  const parentId = parentIdParam
    ? (parentIdParam as Id<"categories">)
    : undefined;
  const categories = await convex.query(api.forum.listCategories, { parentId });
  return c.json(categories);
});

app.get("/categories/:id", async (c) => {
  const id = c.req.param("id") as Id<"categories">;
  const category = await convex.query(api.forum.getCategory, { id });
  return c.json(category);
});

// --- Topics (Read-only via API, write via Convex directly) ---

app.get("/categories/:id/topics", async (c) => {
  const categoryId = c.req.param("id") as Id<"categories">;
  const topics = await convex.query(api.forum.listTopics, { categoryId });
  return c.json(topics);
});

app.get("/topics/:id", async (c) => {
  const id = c.req.param("id") as Id<"topics">;
  const topic = await convex.query(api.forum.getTopic, { id });
  return c.json(topic);
});

// Write operations require authentication - use Convex directly from frontend
app.post("/topics", async (c) => {
  return c.json(
    {
      error: "Use Convex mutations directly for authenticated operations",
      hint: "Import useMutation from convex-solidjs and use api.forum.createTopic",
    },
    401,
  );
});

// --- Posts (Read-only via API, write via Convex directly) ---

app.get("/topics/:id/posts", async (c) => {
  const topicId = c.req.param("id") as Id<"topics">;
  const posts = await convex.query(api.forum.listPosts, { topicId });
  return c.json(posts);
});

// Write operations require authentication - use Convex directly from frontend
app.post("/posts", async (c) => {
  return c.json(
    {
      error: "Use Convex mutations directly for authenticated operations",
      hint: "Import useMutation from convex-solidjs and use api.forum.createPost",
    },
    401,
  );
});

// --- System ---

// Seed endpoint - only available in development
app.post("/seed", async (c) => {
  if (!isDev) {
    return c.json(
      { error: "Seed endpoint is only available in development" },
      403,
    );
  }
  await convex.mutation(api.forum.seed, {});
  return c.json({ success: true });
});

export default {
  port: 4000,
  fetch: app.fetch,
};
