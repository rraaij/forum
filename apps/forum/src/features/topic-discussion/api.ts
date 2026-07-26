/*
 * Topic discussion feature API (plan section 7.2). Mutations run in the
 * browser so Better Auth cookies are naturally included; transport types
 * are inferred from the Hono AppType.
 */

import type { InferRequestType, InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const topicsPost = apiClient.api.topics.$post;
const repliesPost = apiClient.api.topics[":topicId"].replies.$post;
const postPatch = apiClient.api.posts[":postId"].$patch;
const postDelete = apiClient.api.posts[":postId"].$delete;
const viewsPost = apiClient.api.topics[":topicId"].views.$post;

export type CreatedTopic = InferResponseType<typeof topicsPost, 201>;
type CreateTopicRequest = InferRequestType<typeof topicsPost>;
type ReplyRequest = InferRequestType<typeof repliesPost>;
type EditRequest = InferRequestType<typeof postPatch>;
type DeleteRequest = InferRequestType<typeof postDelete>;
type ViewRequest = InferRequestType<typeof viewsPost>;

export async function createTopic(
  input: CreateTopicRequest["json"],
): Promise<CreatedTopic> {
  const res = await topicsPost({ json: input });
  if (res.status !== 201) throw await toApiError(res);
  return res.json();
}

export async function replyToTopic(
  input: ReplyRequest["param"] & ReplyRequest["json"],
): Promise<InferResponseType<typeof repliesPost, 201>> {
  const res = await repliesPost({
    param: { topicId: input.topicId },
    json: { content: input.content, quotedPostId: input.quotedPostId },
  });
  if (res.status !== 201) throw await toApiError(res);
  return res.json();
}

export async function editPost(
  postId: EditRequest["param"]["postId"],
  content: EditRequest["json"]["content"],
): Promise<void> {
  const res = await postPatch({ param: { postId }, json: { content } });
  if (res.status !== 204) throw await toApiError(res);
}

export async function deleteReply(
  postId: DeleteRequest["param"]["postId"],
): Promise<InferResponseType<typeof postDelete, 200>> {
  const res = await postDelete({ param: { postId } });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function recordTopicView(
  topicId: ViewRequest["param"]["topicId"],
  browserSessionId: ViewRequest["json"]["browserSessionId"],
): Promise<InferResponseType<typeof viewsPost, 200>> {
  const res = await viewsPost({
    param: { topicId },
    json: { browserSessionId },
  });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}
