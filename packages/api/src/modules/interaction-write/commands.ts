/*
 * Reaction and vote commands (plan section 5.6). Toggle semantics are
 * deliberately identical to the previous route handlers:
 * - reaction: same (post, user, emoji) present -> removed, else added
 * - vote: same value -> removed, different value -> switched, none -> added
 */

import type { InteractionWriteStore } from "./repository";
import type {
  ApplyVoteInput,
  ApplyVoteResult,
  InteractionWrite,
  ReactionCount,
  ToggleReactionInput,
  ToggleReactionResult,
} from "./types";

export function createInteractionWrite(
  store: InteractionWriteStore,
): InteractionWrite {
  return {
    async toggleReaction(
      input: ToggleReactionInput,
    ): Promise<ToggleReactionResult> {
      return store.transaction(async (tx) => {
        const existing = await tx.findReaction(
          input.postId,
          input.actorId,
          input.emoji,
        );
        if (existing) {
          await tx.deleteReaction(existing.id);
          return { action: "removed" };
        }
        await tx.insertReaction(input.postId, input.actorId, input.emoji);
        return { action: "added" };
      });
    },

    async applyVote(input: ApplyVoteInput): Promise<ApplyVoteResult> {
      return store.transaction(async (tx) => {
        const existing = await tx.findVote(input.postId, input.actorId);
        if (existing) {
          if (existing.value === input.value) {
            await tx.deleteVote(existing.id);
            return { action: "removed" };
          }
          await tx.updateVote(existing.id, input.value);
          return { action: "switched" };
        }
        await tx.insertVote(input.postId, input.actorId, input.value);
        return { action: "added" };
      });
    },

    /*
     * Reads need no lock: they are single statements, and a purge removing
     * the post concurrently simply yields an empty result.
     */
    async getReactions(postId: string): Promise<ReactionCount[]> {
      return store.reactionCounts(postId);
    },

    async getVoteScore(postId: string): Promise<{ score: number }> {
      return { score: await store.voteScore(postId) };
    },
  };
}
