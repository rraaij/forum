/*
 * Reaction and vote transport (plan section 5.6). These endpoints keep the
 * legacy { error: string } failure shape; only their writes moved behind
 * the interaction-write module. Types are inferred from the Hono AppType.
 */

import type { InferResponseType } from "hono/client";
import { toApiError } from "@/lib/api";
import { apiClient } from "@/lib/api-client";

const reactionsGet = apiClient.api.reactions.$get;
const votesGet = apiClient.api.votes.$get;

export type ReactionCounts = InferResponseType<typeof reactionsGet, 200>;
export type VoteScore = InferResponseType<typeof votesGet, 200>;

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

export async function fetchReactions(postId: string): Promise<ReactionCounts> {
  const res = await ensureOk(await reactionsGet({ query: { postId } }));
  return (await res.json()) as ReactionCounts;
}

export async function toggleReaction(
  postId: string,
  emoji: string,
): Promise<{ action: string }> {
  const res = await ensureOk(
    await apiClient.api.reactions.$post({ json: { postId, emoji } }),
  );
  return (await res.json()) as { action: string };
}

export async function fetchVoteScore(postId: string): Promise<VoteScore> {
  const res = await ensureOk(await votesGet({ query: { postId } }));
  return (await res.json()) as VoteScore;
}

export async function applyVote(
  postId: string,
  value: 1 | -1,
): Promise<{ action: string }> {
  const res = await ensureOk(
    await apiClient.api.votes.$post({ json: { postId, value } }),
  );
  return (await res.json()) as { action: string };
}
