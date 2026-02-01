import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
  }).index("email", ["email"]),

  categories: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    order: v.number(),
  }).index("by_parent", ["parentId"]),

  topics: defineTable({
    title: v.string(),
    categoryId: v.id("categories"),
    authorId: v.string(),
    createdAt: v.number(),
  }).index("by_category", ["categoryId"]),

  posts: defineTable({
    topicId: v.id("topics"),
    content: v.string(),
    authorId: v.string(),
    createdAt: v.number(),
  }).index("by_topic", ["topicId"]),
});
