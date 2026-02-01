import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const CONTENT_MIN_LENGTH = 1;
const CONTENT_MAX_LENGTH = 50000;

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

export const listByTopic = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    topicId: v.id("topics"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to post");
    }

    validateContent(args.content);

    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    return await ctx.db.insert("posts", {
      topicId: args.topicId,
      content: args.content.trim(),
      authorId: userId,
      createdAt: Date.now(),
    });
  },
});
