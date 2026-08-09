/*
 * Board management feature API (plan sections 6.2 and 7.2). Transport types
 * are inferred from the exported Hono AppType; the board tree itself is
 * read through the public forum index, so admin has no private read model.
 */

import type { InferRequestType, InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const purgeImpactGet =
  apiClient.api.admin.boards[":boardId"]["purge-impact"].$get;
const boardsPost = apiClient.api.admin.boards.$post;
const boardsOrderPut = apiClient.api.admin.boards.order.$put;
const boardPatch = apiClient.api.admin.boards[":boardId"].$patch;
const boardMovePost = apiClient.api.admin.boards[":boardId"].move.$post;
const boardPurgePost = apiClient.api.admin.boards[":boardId"].purge.$post;

export type PurgeImpact = InferResponseType<typeof purgeImpactGet, 200>;
export type PurgeImpactCounts = InferResponseType<typeof boardPurgePost, 200>;
type CreateBoardRequest = InferRequestType<typeof boardsPost>;
type UpdateBoardRequest = InferRequestType<typeof boardPatch>;
type ReorderBoardsRequest = InferRequestType<typeof boardsOrderPut>;
type MoveBoardRequest = InferRequestType<typeof boardMovePost>;
type PurgeImpactRequest = InferRequestType<typeof purgeImpactGet>;
type PurgeBoardRequest = InferRequestType<typeof boardPurgePost>;

/** Form fields are a projection of the server-owned creation contract. */
export type BoardFields = Omit<CreateBoardRequest["json"], "parentId">;

export async function createBoard(
  input: CreateBoardRequest["json"],
): Promise<InferResponseType<typeof boardsPost, 201>> {
  const res = await boardsPost({ json: input });
  if (res.status !== 201) throw await toApiError(res);
  return res.json();
}

export async function updateBoard(
  boardId: UpdateBoardRequest["param"]["boardId"],
  input: UpdateBoardRequest["json"],
): Promise<void> {
  const res = await boardPatch({ param: { boardId }, json: input });
  if (res.status !== 204) throw await toApiError(res);
}

export async function reorderBoardGroups(
  groups: ReorderBoardsRequest["json"]["groups"],
): Promise<InferResponseType<typeof boardsOrderPut, 200>> {
  const res = await boardsOrderPut({ json: { groups } });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function moveBoard(
  boardId: MoveBoardRequest["param"]["boardId"],
  newParentId: MoveBoardRequest["json"]["newParentId"],
  sortOrder: MoveBoardRequest["json"]["sortOrder"],
): Promise<void> {
  const res = await boardMovePost({
    param: { boardId },
    json: { newParentId, sortOrder },
  });
  if (res.status !== 204) throw await toApiError(res);
}

export async function fetchPurgeImpact(
  boardId: PurgeImpactRequest["param"]["boardId"],
): Promise<PurgeImpact> {
  const res = await purgeImpactGet({ param: { boardId } });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function purgeBoard(
  boardId: PurgeBoardRequest["param"]["boardId"],
  confirmationName: PurgeBoardRequest["json"]["confirmationName"],
  expectedImpact: PurgeBoardRequest["json"]["expectedImpact"],
): Promise<PurgeImpactCounts> {
  const res = await boardPurgePost({
    param: { boardId },
    json: { confirmationName, expectedImpact },
  });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}
