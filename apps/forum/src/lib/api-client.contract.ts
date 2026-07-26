/*
 * COMPILE-ONLY contract test (refactor plan section 6.2). Never imported at
 * runtime; `pnpm typecheck` compiles it, so it fails when the exported Hono
 * routes and this frontend client drift apart.
 */

import type { InferRequestType, InferResponseType } from "hono/client";
import type { apiClient } from "./api-client";

type Assert<T extends true> = T;

// /health exists and returns the expected shape.
type HealthResponse = InferResponseType<typeof apiClient.health.$get>;
export type HealthOk = Assert<
  HealthResponse extends { status: string } ? true : false
>;

// Replacement topic creation requires the boards model.
type CreateTopicRequest = InferRequestType<
  typeof apiClient.api.topics.$post
>["json"];
type CreateTopicResponse = InferResponseType<
  typeof apiClient.api.topics.$post,
  201
>;
export type CreateTopicShape = Assert<
  CreateTopicRequest extends { boardId: string; title: string; content: string }
    ? true
    : false
>;
export type CreateTopicCanonicalRoute = Assert<
  CreateTopicResponse extends {
    routeParams: { kind: "rootTopic" | "boardTopic" };
  }
    ? true
    : false
>;

// Replies carry only the quoted post ID; snapshots are server-built.
type ReplyRequest = InferRequestType<
  (typeof apiClient.api.topics)[":topicId"]["replies"]["$post"]
>["json"];
export type ReplyShape = Assert<
  ReplyRequest extends { content: string; quotedPostId?: string | undefined }
    ? true
    : false
>;

// The forum index returns recursively nested root boards.
type ForumIndexResponse = InferResponseType<
  typeof apiClient.api.forum.$get,
  200
>;
export type ForumIndexShape = Assert<
  ForumIndexResponse extends {
    categories: Array<{ id: string; totalTopicCount: number }>;
  }
    ? true
    : false
>;

// Topic pages expose the explicit opening post and a reply page.
type TopicPageResponse = InferResponseType<
  (typeof apiClient.api.forum.topics)[":topicSlug"]["$get"],
  200
>;
export type TopicPageShape = Assert<
  TopicPageResponse extends {
    openingPost: { kind: "opening" | "reply" };
    replies: { items: unknown[]; nextCursor: string | null };
  }
    ? true
    : false
>;

/*
 * Activity carries the post's own kind and the canonical route params, so
 * the profile UI never re-derives a topic URL from slugs.
 */
type ActivityResponse = InferResponseType<
  typeof apiClient.api.profile.activity.$get,
  200
>;
export type ActivityShape = Assert<
  ActivityResponse extends Array<{
    postKind: "opening" | "reply";
    isDeleted: boolean;
    routeParams: { kind: "rootTopic" | "boardTopic" } | null;
  }>
    ? true
    : false
>;

// Legacy vote endpoint remains until Phase 5.
type VoteRequest = InferRequestType<typeof apiClient.api.votes.$post>["json"];
export type VoteValueIsNumber = Assert<
  VoteRequest extends { postId: string; value: number } ? true : false
>;
