import { zValidator } from "@hono/zod-validator";
import { ConvexClient } from "convex/browser";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { api } from "../db/convex/_generated/api";

const app = new Hono();

// Middleware
app.use("/*", cors());

// Convex Client
const convexUrl = Bun.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("VITE_CONVEX_URL is not defined");
const convex = new ConvexClient(convexUrl);

// --- Categories ---

app.get("/categories", async (c) => {
  const parentId = c.req.query("parentId") as any;
  const categories = await convex.query(api.forum.listCategories, { parentId });
  return c.json(categories);
});

app.get("/categories/:id", async (c) => {
  const id = c.req.param("id") as any;
  const category = await convex.query(api.forum.getCategory, { id });
  return c.json(category);
});

// --- Topics ---

app.get("/categories/:id/topics", async (c) => {
  const categoryId = c.req.param("id") as any;
  const topics = await convex.query(api.forum.listTopics, { categoryId });
  return c.json(topics);
});

app.get("/topics/:id", async (c) => {
  const id = c.req.param("id") as any;
  const topic = await convex.query(api.forum.getTopic, { id });
  return c.json(topic);
});

app.post(
  "/topics",
  zValidator(
    "json",
    z.object({
      title: z.string(),
      categoryId: z.string(),
      authorId: z.string(),
      content: z.string(),
    }),
  ),
  async (c) => {
    const data = c.req.valid("json");
    const topicId = await convex.mutation(api.forum.createTopic, data as any);
    return c.json({ topicId });
  },
);

// --- Posts ---

app.get("/topics/:id/posts", async (c) => {
  const topicId = c.req.param("id") as any;
  const posts = await convex.query(api.forum.listPosts, { topicId });
  return c.json(posts);
});

app.post(
  "/posts",
  zValidator(
    "json",
    z.object({
      topicId: z.string(),
      content: z.string(),
      authorId: z.string(),
    }),
  ),
  async (c) => {
    const data = c.req.valid("json");
    const postId = await convex.mutation(api.forum.createPost, data as any);
    return c.json({ postId });
  },
);

// --- System ---

app.post("/seed", async (c) => {
  await convex.mutation(api.forum.seed, {});
  return c.json({ success: true });
});

export default {
  port: 4000,
  fetch: app.fetch,
};
