import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 200;
const CONTENT_MIN_LENGTH = 1;
const CONTENT_MAX_LENGTH = 50000;

function validateTitle(title: string): void {
  const trimmed = title.trim();
  if (trimmed.length < TITLE_MIN_LENGTH) {
    throw new Error(`Title must be at least ${TITLE_MIN_LENGTH} characters`);
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    throw new Error(`Title must be less than ${TITLE_MAX_LENGTH} characters`);
  }
}

function validateContent(content: string): void {
  const trimmed = content.trim();
  if (trimmed.length < CONTENT_MIN_LENGTH) {
    throw new Error("Content cannot be empty");
  }
  if (trimmed.length > CONTENT_MAX_LENGTH) {
    throw new Error(
      `Content must be less than ${CONTENT_MAX_LENGTH} characters`
    );
  }
}

export const listByCategory = query({
  args: { categoryId: v.union(v.id("categories"), v.literal("all")) },
  handler: async (ctx, args) => {
    if (args.categoryId === "all") {
      return await ctx.db.query("topics").order("desc").take(50);
    }
    const catId = args.categoryId;
    return await ctx.db
      .query("topics")
      .withIndex("by_category", (q) => q.eq("categoryId", catId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("topics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    categoryId: v.id("categories"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to create a topic");
    }

    validateTitle(args.title);
    validateContent(args.content);

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const topicId = await ctx.db.insert("topics", {
      title: args.title.trim(),
      categoryId: args.categoryId,
      authorId: userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("posts", {
      topicId,
      content: args.content.trim(),
      authorId: userId,
      createdAt: Date.now(),
    });

    return topicId;
  },
});
