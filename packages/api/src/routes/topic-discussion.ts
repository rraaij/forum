/*
 * Hono adapters for the topic discussion module (refactor plan section 6).
 * Adapters contain only runtime validation, actor extraction, module
 * invocation, and HTTP mapping.
 */

import { Hono } from "hono";
import { isDomainError } from "../modules/shared/errors";
import type { TopicDiscussion } from "../modules/topic-discussion/types";
import { respondWithDomainError } from "../transport/error-envelope";
import {
  createTopicBodySchema,
  editPostBodySchema,
  postIdParamSchema,
  recordTopicViewBodySchema,
  replyToTopicBodySchema,
  topicIdParamSchema,
} from "../transport/schemas";
import {
  requireActor,
  transportBodyLimit,
  transportValidator,
} from "../transport/validator";
import type { AppEnv } from "../types";

export function createTopicRoutes(discussion: TopicDiscussion) {
  return (
    new Hono<AppEnv>()
      // POST /api/topics — create topic with its opening post
      .post(
        "/",
        requireActor,
        transportBodyLimit(),
        transportValidator("json", createTopicBodySchema),
        async (c) => {
          // biome-ignore lint/style/noNonNullAssertion: requireActor ran
          const user = c.get("user")!;
          try {
            const result = await discussion.createTopic({
              actorId: user.id,
              ...c.req.valid("json"),
            });
            return c.json(result, 201);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      // POST /api/topics/:topicId/replies — reply, optionally quoting
      .post(
        "/:topicId/replies",
        requireActor,
        transportBodyLimit(),
        transportValidator("param", topicIdParamSchema),
        transportValidator("json", replyToTopicBodySchema),
        async (c) => {
          // biome-ignore lint/style/noNonNullAssertion: requireActor ran
          const user = c.get("user")!;
          try {
            const result = await discussion.replyToTopic({
              ...c.req.valid("json"),
              actorId: user.id,
              topicId: c.req.valid("param").topicId,
            });
            return c.json(result, 201);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      // POST /api/topics/:topicId/views — explicit, deduplicated view command
      .post(
        "/:topicId/views",
        transportBodyLimit(),
        transportValidator("param", topicIdParamSchema),
        transportValidator("json", recordTopicViewBodySchema),
        async (c) => {
          try {
            const result = await discussion.recordTopicView({
              topicId: c.req.valid("param").topicId,
              browserSessionId: c.req.valid("json").browserSessionId,
            });
            return c.json(result);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
  );
}

export function createPostRoutes(discussion: TopicDiscussion) {
  return (
    new Hono<AppEnv>()
      // PATCH /api/posts/:postId — edit content (author only)
      .patch(
        "/:postId",
        requireActor,
        transportBodyLimit(),
        transportValidator("param", postIdParamSchema),
        transportValidator("json", editPostBodySchema),
        async (c) => {
          // biome-ignore lint/style/noNonNullAssertion: requireActor ran
          const user = c.get("user")!;
          try {
            await discussion.editPost({
              actor: { id: user.id, role: user.role },
              postId: c.req.valid("param").postId,
              content: c.req.valid("json").content,
            });
            return c.body(null, 204);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      // DELETE /api/posts/:postId — idempotent soft delete of a reply
      .delete(
        "/:postId",
        requireActor,
        transportValidator("param", postIdParamSchema),
        async (c) => {
          // biome-ignore lint/style/noNonNullAssertion: requireActor ran
          const user = c.get("user")!;
          try {
            const result = await discussion.deleteReply({
              actor: { id: user.id, role: user.role },
              postId: c.req.valid("param").postId,
            });
            return c.json(result);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
  );
}
