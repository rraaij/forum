import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    order: v.number(),
  }).index("by_parent", ["parentId"]),

  topics: defineTable({
    title: v.string(),
    categoryId: v.id("categories"),
    authorId: v.string(), // For now, just a string (simple auth or anonymous)
    createdAt: v.number(),
  }).index("by_category", ["categoryId"]),

  posts: defineTable({
    topicId: v.id("topics"),
    content: v.string(),
    authorId: v.string(),
    createdAt: v.number(),
  }).index("by_topic", ["topicId"]),
});
