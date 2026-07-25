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
  };
}
