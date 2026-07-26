import { z } from "zod";
import {
  POST_CONTENT_MAX,
  TOPIC_TITLE_MAX,
  TOPIC_TITLE_MIN,
} from "../../modules/topic-discussion/validation";
import { uuidSchema } from "./shared";

const topicTitleSchema = z
  .string()
  .trim()
  .min(TOPIC_TITLE_MIN)
  .max(TOPIC_TITLE_MAX);

const postContentSchema = z.string().trim().min(1).max(POST_CONTENT_MAX);

// POST /api/topics
export const createTopicBodySchema = z.object({
  boardId: uuidSchema,
  title: topicTitleSchema,
  content: postContentSchema,
});

// POST /api/topics/:topicId/replies
export const topicIdParamSchema = z.object({ topicId: uuidSchema });
export const replyToTopicBodySchema = z.object({
  content: postContentSchema,
  // Only the ID crosses the transport; the snapshot is built server-side.
  quotedPostId: uuidSchema.optional(),
});

// PATCH /api/posts/:postId and DELETE /api/posts/:postId
export const postIdParamSchema = z.object({ postId: uuidSchema });
export const editPostBodySchema = z.object({ content: postContentSchema });

// POST /api/topics/:topicId/views
export const recordTopicViewBodySchema = z.object({
  browserSessionId: uuidSchema,
});
