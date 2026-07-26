import { describe, expect, it, vi } from "vitest";
import type { InteractionWrite } from "../../src/modules/interaction-write/types";
import { createReactionRoutes } from "../../src/routes/reactions";
import { createVoteRoutes } from "../../src/routes/votes";

const VALID_POST_ID = "6f6dcbcf-2f3e-4c39-9a4a-111111111111";

function interactionStub(): InteractionWrite {
  return {
    toggleReaction: vi.fn(async () => ({ action: "added" })),
    applyVote: vi.fn(async () => ({ action: "added" })),
    getReactions: vi.fn(async () => []),
    getVoteScore: vi.fn(async () => ({ score: 0 })),
  };
}

describe.each([
  {
    name: "reactions",
    createRoute: createReactionRoutes,
    readMethod: "getReactions" as const,
  },
  {
    name: "votes",
    createRoute: createVoteRoutes,
    readMethod: "getVoteScore" as const,
  },
])("GET /api/$name query validation", ({ createRoute, readMethod }) => {
  it("rejects a malformed postId before invoking the module", async () => {
    const interactions = interactionStub();
    const res = await createRoute(interactions).request("/?postId=not-a-uuid");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "postId must be a valid ID" });
    expect(interactions[readMethod]).not.toHaveBeenCalled();
  });

  it("keeps the required-field error and accepts a valid UUID", async () => {
    const interactions = interactionStub();
    const route = createRoute(interactions);

    const missing = await route.request("/");
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "postId is required" });
    expect(interactions[readMethod]).not.toHaveBeenCalled();

    const valid = await route.request(`/?postId=${VALID_POST_ID}`);
    expect(valid.status).toBe(200);
    expect(interactions[readMethod]).toHaveBeenCalledOnce();
    expect(interactions[readMethod]).toHaveBeenCalledWith(VALID_POST_ID);
  });
});
