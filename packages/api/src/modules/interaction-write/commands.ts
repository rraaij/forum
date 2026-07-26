/*
 * Reaction and vote commands (plan section 5.6). Toggle semantics are
 * deliberately identical to the previous route handlers:
 * - reaction: same (post, user, emoji) present -> removed, else added
 * - vote: same value -> removed, different value -> switched, none -> added
 */

import { validationError } from "../shared/errors";
import type { InteractionWriteStore } from "./repository";
import type {
  ApplyVoteInput,
  ApplyVoteResult,
  InteractionWrite,
  ReactionCount,
  ToggleReactionInput,
  ToggleReactionResult,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertPostId(postId: string): void {
  if (!UUID_PATTERN.test(postId)) {
    throw validationError("INVALID_ID", "postId must be a valid ID", "postId");
  }
}

function assertEmoji(emoji: string): void {
  const length = [...emoji].length;
  if (length < 1 || length > 32) {
    throw validationError(
      "INVALID_REACTION_EMOJI",
      "emoji must contain between 1 and 32 characters",
      "emoji",
    );
  }
}

function assertVoteValue(value: number): asserts value is 1 | -1 {
  if (value !== 1 && value !== -1) {
    throw validationError(
      "INVALID_VOTE_VALUE",
      "value must be 1 or -1",
      "value",
    );
  }
}

export function createInteractionWrite(
  store: InteractionWriteStore,
): InteractionWrite {
  return {
    async toggleReaction(
      input: ToggleReactionInput,
    ): Promise<ToggleReactionResult> {
      assertPostId(input.postId);
      assertEmoji(input.emoji);
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
      assertPostId(input.postId);
      const value: number = input.value;
      assertVoteValue(value);
      return store.transaction(async (tx) => {
        const existing = await tx.findVote(input.postId, input.actorId);
        if (existing) {
          if (existing.value === value) {
            await tx.deleteVote(existing.id);
            return { action: "removed" };
          }
          await tx.updateVote(existing.id, value);
          return { action: "switched" };
        }
        await tx.insertVote(input.postId, input.actorId, value);
        return { action: "added" };
      });
    },

    /*
     * Reads need no lock: they are single statements, and a purge removing
     * the post concurrently simply yields an empty result.
     */
    async getReactions(postId: string): Promise<ReactionCount[]> {
      assertPostId(postId);
      return store.reactionCounts(postId);
    },

    async getVoteScore(postId: string): Promise<{ score: number }> {
      assertPostId(postId);
      return { score: await store.voteScore(postId) };
    },
  };
}
