import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { parentId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .order("asc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
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
