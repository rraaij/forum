/*
 * Topic discussion feature API (plan section 7.2). Mutations run in the
 * browser so Better Auth cookies are naturally included; transport types
 * are inferred from the Hono AppType.
 */

import type { InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const topicsPost = apiClient.api.topics.$post;

export type CreatedTopic = InferResponseType<typeof topicsPost, 201>;

async function ensureOk<T extends { ok: boolean }>(res: T): Promise<T> {
  if (!res.ok) {
    throw await toApiError(
      res as unknown as {
        status: number;
        statusText: string;
        json(): Promise<unknown>;
      },
    );
  }
  return res;
}

export async function createTopic(input: {
  boardId: string;
  title: string;
  content: string;
}): Promise<CreatedTopic> {
  const res = await ensureOk(await topicsPost({ json: input }));
  return (await res.json()) as CreatedTopic;
}

export async function replyToTopic(input: {
  topicId: string;
  content: string;
  quotedPostId?: string;
}): Promise<{ postId: string }> {
  const res = await ensureOk(
    await apiClient.api.topics[":topicId"].replies.$post({
      param: { topicId: input.topicId },
      json: { content: input.content, quotedPostId: input.quotedPostId },
    }),
  );
  return (await res.json()) as { postId: string };
}

export async function editPost(postId: string, content: string): Promise<void> {
  await ensureOk(
    await apiClient.api.posts[":postId"].$patch({
      param: { postId },
      json: { content },
    }),
  );
}

export async function deleteReply(
  postId: string,
): Promise<{ alreadyDeleted: boolean }> {
  const res = await ensureOk(
    await apiClient.api.posts[":postId"].$delete({ param: { postId } }),
  );
  return (await res.json()) as { alreadyDeleted: boolean };
}

export async function recordTopicView(
  topicId: string,
  browserSessionId: string,
): Promise<{ counted: boolean }> {
  const res = await ensureOk(
    await apiClient.api.topics[":topicId"].views.$post({
      param: { topicId },
      json: { browserSessionId },
    }),
  );
  return (await res.json()) as { counted: boolean };
}
