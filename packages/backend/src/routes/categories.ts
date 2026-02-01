import { Hono } from "hono";
import { convexClient } from "../lib/convex.js";
import { api } from "../../../convex/convex/_generated/api.js";

const categories = new Hono();

categories.get("/", async (c) => {
  try {
    const result = await convexClient.query(api.categories.list);
    return c.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

categories.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await convexClient.query(api.categories.get, { id });
    return c.json(result);
  } catch (error) {
    console.error("Error fetching category:", error);
    return c.json({ error: "Failed to fetch category" }, 500);
  }
});

categories.get("/:id/topics", async (c) => {
  try {
    const categoryId = c.req.param("id");
    const result = await convexClient.query(api.topics.listByCategory, {
      categoryId,
    });
    return c.json(result);
  } catch (error) {
    console.error("Error fetching topics:", error);
    return c.json({ error: "Failed to fetch topics" }, 500);
  }
});

export default categories;
