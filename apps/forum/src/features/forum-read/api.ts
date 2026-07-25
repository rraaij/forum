/*
 * Forum read feature API (refactor plan sections 6.2 and 7.2). Every
 * transport type is INFERRED from the exported Hono AppType — nothing here
 * is hand-maintained. Loaders request the first page; "Load more" requests
 * subsequent pages with the returned cursor.
 */

import type { InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const forumIndexGet = apiClient.api.forum.$get;
const categoryGet = apiClient.api.forum.categories[":categorySlug"].$get;
const boardGet =
  apiClient.api.forum.categories[":categorySlug"].boards[":boardId"].$get;
const topicGet = apiClient.api.forum.topics[":topicSlug"].$get;

export type ForumIndex = InferResponseType<typeof forumIndexGet, 200>;
export type BoardTreeNode = ForumIndex["categories"][number];
export type CategoryPage = InferResponseType<typeof categoryGet, 200>;
export type BoardPage = InferResponseType<typeof boardGet, 200>;
export type TopicPage = InferResponseType<typeof topicGet, 200>;
export type BoardSummary = CategoryPage["childBoards"][number];
export type TopicListItem = CategoryPage["topics"]["items"][number];
export type PostView = TopicPage["openingPost"];
export type TopicRouteParams = TopicListItem["routeParams"];
export type Breadcrumb = TopicPage["breadcrumbs"][number];

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

export async function fetchForumIndex(): Promise<ForumIndex> {
  const res = await ensureOk(await forumIndexGet());
  return (await res.json()) as ForumIndex;
}

export async function fetchCategoryPage(
  categorySlug: string,
  topicCursor?: string,
): Promise<CategoryPage> {
  const res = await ensureOk(
    await categoryGet({
      param: { categorySlug },
      query: topicCursor ? { topicCursor } : {},
    }),
  );
  return (await res.json()) as CategoryPage;
}

export async function fetchBoardPage(
  categorySlug: string,
  boardId: string,
  topicCursor?: string,
): Promise<BoardPage> {
  const res = await ensureOk(
    await boardGet({
      param: { categorySlug, boardId },
      query: topicCursor ? { topicCursor } : {},
    }),
  );
  return (await res.json()) as BoardPage;
}

export async function fetchTopicPage(
  topicSlug: string,
  replyCursor?: string,
): Promise<TopicPage> {
  const res = await ensureOk(
    await topicGet({
      param: { topicSlug },
      query: replyCursor ? { replyCursor } : {},
    }),
  );
  return (await res.json()) as TopicPage;
}
