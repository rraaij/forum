import { Hono } from "hono";
import { convexClient } from "../lib/convex.js";
import { api } from "../../../convex/convex/_generated/api.js";
import { requireAuth, type AuthEnv } from "../middleware/auth.js";

const topics = new Hono<AuthEnv>();

topics.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await convexClient.query(api.topics.get, { id });
    return c.json(result);
  } catch (error) {
    console.error("Error fetching topic:", error);
    return c.json({ error: "Failed to fetch topic" }, 500);
  }
});

topics.post("/", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { title, categoryId } = body;

    if (!title || !categoryId) {
      return c.json({ error: "Title and categoryId are required" }, 400);
    }

    const result = await convexClient.mutation(api.topics.create, {
      title,
      categoryId,
      authorId: userId!,
    });

    return c.json(result);
  } catch (error) {
    console.error("Error creating topic:", error);
    return c.json({ error: "Failed to create topic" }, 500);
  }
});

export default topics;
