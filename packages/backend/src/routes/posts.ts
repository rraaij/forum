import { Hono } from "hono";
import { convexClient } from "../lib/convex.js";
import { api } from "../../../convex/convex/_generated/api.js";
import { requireAuth, type AuthEnv } from "../middleware/auth.js";

const posts = new Hono<AuthEnv>();

posts.get("/topic/:topicId", async (c) => {
  try {
    const topicId = c.req.param("topicId");
    const result = await convexClient.query(api.posts.listByTopic, {
      topicId,
    });
    return c.json(result);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

posts.post("/", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { content, topicId } = body;

    if (!content || !topicId) {
      return c.json({ error: "Content and topicId are required" }, 400);
    }

    const result = await convexClient.mutation(api.posts.create, {
      content,
      topicId,
      authorId: userId!,
    });

    return c.json(result);
  } catch (error) {
    console.error("Error creating post:", error);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

export default posts;
