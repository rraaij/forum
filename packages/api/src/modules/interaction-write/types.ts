/*
 * Interaction contract (refactor plan section 5.6). NOT a redesign: every
 * operation keeps the behavior and HTTP contract the route handlers had.
 * The module exists so these writes acquire the shared forum-content
 * advisory lock inside their own transaction, which is what makes recursive
 * board purge safe against concurrent interactions — and so the adapters
 * hold no database access of their own.
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

export interface ReactionCount {
  emoji: string;
  count: number;
}

export interface InteractionWrite {
  toggleReaction(input: ToggleReactionInput): Promise<ToggleReactionResult>;
  applyVote(input: ApplyVoteInput): Promise<ApplyVoteResult>;
  getReactions(postId: string): Promise<ReactionCount[]>;
  getVoteScore(postId: string): Promise<{ score: number }>;
}
