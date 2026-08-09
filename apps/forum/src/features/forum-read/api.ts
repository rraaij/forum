/*
 * Forum read feature API (refactor plan sections 6.2 and 7.2). Every
 * transport type is INFERRED from the exported Hono AppType — nothing here
 * is hand-maintained. Loaders request the first page; "Load more" requests
 * subsequent pages with the returned cursor.
 */

import type { InferRequestType, InferResponseType } from "hono/client";
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

type CategoryRequest = InferRequestType<typeof categoryGet>;
type BoardRequest = InferRequestType<typeof boardGet>;
type TopicRequest = InferRequestType<typeof topicGet>;

export async function fetchForumIndex(): Promise<ForumIndex> {
  const res = await forumIndexGet();
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function fetchCategoryPage(
  categorySlug: CategoryRequest["param"]["categorySlug"],
  topicCursor?: CategoryRequest["query"]["topicCursor"],
): Promise<CategoryPage> {
  const res = await categoryGet({
    param: { categorySlug },
    query: topicCursor ? { topicCursor } : {},
  });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function fetchBoardPage(
  categorySlug: BoardRequest["param"]["categorySlug"],
  boardId: BoardRequest["param"]["boardId"],
  topicCursor?: BoardRequest["query"]["topicCursor"],
): Promise<BoardPage> {
  const res = await boardGet({
    param: { categorySlug, boardId },
    query: topicCursor ? { topicCursor } : {},
  });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function fetchTopicPage(
  topicSlug: TopicRequest["param"]["topicSlug"],
  replyCursor?: TopicRequest["query"]["replyCursor"],
  targetReplyId?: TopicRequest["query"]["targetReplyId"],
): Promise<TopicPage> {
  const res = await topicGet({
    param: { topicSlug },
    query: {
      ...(replyCursor ? { replyCursor } : {}),
      ...(targetReplyId ? { targetReplyId } : {}),
    },
  });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}
