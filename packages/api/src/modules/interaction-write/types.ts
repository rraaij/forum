/*
 * Interaction write contract (refactor plan section 5.6). NOT a redesign:
 * toggleReaction and applyVote keep the current route behavior. The module
 * exists so these writes leave route adapters and acquire the shared
 * forum-content advisory lock inside their own transaction (Phase 5).
 */

export interface ToggleReactionInput {
  actorId: string;
  postId: string;
  emoji: string;
}

export type ToggleReactionResult = { action: "added" | "removed" };

export interface ApplyVoteInput {
  actorId: string;
  postId: string;
  value: 1 | -1;
}

export type ApplyVoteResult = { action: "added" | "removed" | "switched" };

export interface InteractionWrite {
  toggleReaction(input: ToggleReactionInput): Promise<ToggleReactionResult>;
  applyVote(input: ApplyVoteInput): Promise<ApplyVoteResult>;
}
