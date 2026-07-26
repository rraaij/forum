/*
 * Reaction and vote transport (plan section 5.6). These endpoints keep the
 * legacy { error: string } failure shape; only their writes moved behind
 * the interaction-write module. Types are inferred from the Hono AppType.
 */

import type { InferRequestType, InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const reactionsGet = apiClient.api.reactions.$get;
const votesGet = apiClient.api.votes.$get;
const reactionsPost = apiClient.api.reactions.$post;
const votesPost = apiClient.api.votes.$post;

export type ReactionCounts = InferResponseType<typeof reactionsGet, 200>;
export type VoteScore = InferResponseType<typeof votesGet, 200>;
type ReactionsRequest = InferRequestType<typeof reactionsGet>;
type ReactionRequest = InferRequestType<typeof reactionsPost>;
type VotesRequest = InferRequestType<typeof votesGet>;
type VoteRequest = InferRequestType<typeof votesPost>;

export async function fetchReactions(
  postId: ReactionsRequest["query"]["postId"],
): Promise<ReactionCounts> {
  const res = await reactionsGet({ query: { postId } });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function toggleReaction(
  postId: ReactionRequest["json"]["postId"],
  emoji: ReactionRequest["json"]["emoji"],
): Promise<InferResponseType<typeof reactionsPost, 200 | 201>> {
  const res = await reactionsPost({ json: { postId, emoji } });
  if (res.status !== 200 && res.status !== 201) throw await toApiError(res);
  return res.json();
}

export async function fetchVoteScore(
  postId: VotesRequest["query"]["postId"],
): Promise<VoteScore> {
  const res = await votesGet({ query: { postId } });
  if (res.status !== 200) throw await toApiError(res);
  return res.json();
}

export async function applyVote(
  postId: VoteRequest["json"]["postId"],
  value: VoteRequest["json"]["value"],
): Promise<InferResponseType<typeof votesPost, 200 | 201>> {
  const res = await votesPost({ json: { postId, value } });
  if (res.status !== 200 && res.status !== 201) throw await toApiError(res);
  return res.json();
}
