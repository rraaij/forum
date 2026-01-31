import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Queries

export const listCategories = query({
  args: { parentId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .order("asc")
      .collect();
  },
});

export const getCategory = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listTopics = query({
  args: { categoryId: v.union(v.id("categories"), v.literal("all")) },
  handler: async (ctx, args) => {
    if (args.categoryId === "all") {
      return await ctx.db.query("topics").order("desc").take(50);
    }
    return await ctx.db
      .query("topics")
      .withIndex("by_category", (q) =>
        q.eq("categoryId", args.categoryId as any),
      )
      .order("desc")
      .collect();
  },
});

export const getTopic = query({
  args: { id: v.id("topics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listPosts = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .order("asc")
      .collect();
  },
});

// Mutations

export const createCategory = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categories", args);
  },
});

export const createTopic = mutation({
  args: {
    title: v.string(),
    categoryId: v.id("categories"),
    authorId: v.string(),
    content: v.string(), // First post content
  },
  handler: async (ctx, args) => {
    const topicId = await ctx.db.insert("topics", {
      title: args.title,
      categoryId: args.categoryId,
      authorId: args.authorId,
      createdAt: Date.now(),
    });
    await ctx.db.insert("posts", {
      topicId,
      content: args.content,
      authorId: args.authorId,
      createdAt: Date.now(),
    });
    return topicId;
  },
});

export const createPost = mutation({
  args: {
    topicId: v.id("topics"),
    content: v.string(),
    authorId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("posts", {
      topicId: args.topicId,
      content: args.content,
      authorId: args.authorId,
      createdAt: Date.now(),
    });
  },
});

// Seed data
export const seed = mutation({
  handler: async (ctx) => {
    // Check if categories already exist
    const existing = await ctx.db.query("categories").first();
    if (existing) return;

    const cat1 = await ctx.db.insert("categories", {
      title: "General Discussion",
      description: "Talk about anything and everything.",
      order: 1,
    });

    const cat2 = await ctx.db.insert("categories", {
      title: "Technology",
      description: "Latest trends in tech.",
      order: 2,
    });

    const sub1 = await ctx.db.insert("categories", {
      title: "Programming",
      description: "Code, code, and more code.",
      parentId: cat2,
      order: 1,
    });

    const topic1 = await ctx.db.insert("topics", {
      title: "Welcome to the new forum!",
      categoryId: cat1,
      authorId: "admin",
      createdAt: Date.now(),
    });

    await ctx.db.insert("posts", {
      topicId: topic1,
      content: "We hope you enjoy your stay!",
      authorId: "admin",
      createdAt: Date.now(),
    });

    const topic2 = await ctx.db.insert("topics", {
      title: "SolidJS is awesome",
      categoryId: sub1,
      authorId: "dev",
      createdAt: Date.now(),
    });

    await ctx.db.insert("posts", {
      topicId: topic2,
      content: "Signals make everything so much easier.",
      authorId: "dev",
      createdAt: Date.now(),
    });
  },
});
