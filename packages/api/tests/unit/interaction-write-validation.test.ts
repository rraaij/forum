import { describe, expect, it, vi } from "vitest";
import { createInteractionWrite } from "../../src/modules/interaction-write/commands";
import type { InteractionWriteStore } from "../../src/modules/interaction-write/repository";
import { DomainError } from "../../src/modules/shared/errors";

const VALID_POST_ID = "6f6dcbcf-2f3e-4c39-9a4a-111111111111";

function storeStub(): InteractionWriteStore {
  return {
    transaction: vi.fn(() => {
      throw new Error("transaction should not start");
    }),
    reactionCounts: vi.fn(async () => []),
    voteScore: vi.fn(async () => 0),
  };
}

describe("interaction module validation", () => {
  it("rejects malformed IDs on reads and writes before persistence", async () => {
    const store = storeStub();
    const interactions = createInteractionWrite(store);

    await expect(interactions.getReactions("bad-id")).rejects.toMatchObject({
      code: "INVALID_ID",
    });
    await expect(interactions.getVoteScore("bad-id")).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(
      interactions.toggleReaction({
        actorId: "actor",
        postId: "bad-id",
        emoji: "+1",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ID" });
    expect(store.transaction).not.toHaveBeenCalled();
    expect(store.reactionCounts).not.toHaveBeenCalled();
    expect(store.voteScore).not.toHaveBeenCalled();
  });

  it("enforces emoji and vote bounds at the module seam", async () => {
    const store = storeStub();
    const interactions = createInteractionWrite(store);

    await expect(
      interactions.toggleReaction({
        actorId: "actor",
        postId: VALID_POST_ID,
        emoji: "",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REACTION_EMOJI" });
    await expect(
      interactions.toggleReaction({
        actorId: "actor",
        postId: VALID_POST_ID,
        emoji: "x".repeat(33),
      }),
    ).rejects.toMatchObject({ code: "INVALID_REACTION_EMOJI" });
    await expect(
      interactions.applyVote({
        actorId: "actor",
        postId: VALID_POST_ID,
        value: 0 as 1,
      }),
    ).rejects.toMatchObject({ code: "INVALID_VOTE_VALUE" });
    expect(store.transaction).not.toHaveBeenCalled();
  });
});
