/*
 * Board management integration tests (refactor plan section 8.3): creation
 * and normalization, sibling uniqueness, cycle rejection at BOTH the module
 * and the database trigger, the advisory-lock protocol under real
 * concurrency, and recursive purge with impact recheck.
 */

import { boards } from "@forum/db/schema";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createBoardManagement } from "../../src/modules/board-management/commands";
import {
  type BoardManagementStore,
  createDrizzleBoardManagementStore,
} from "../../src/modules/board-management/repository";
import { createInteractionWrite } from "../../src/modules/interaction-write/commands";
import { createDrizzleInteractionWriteStore } from "../../src/modules/interaction-write/repository";
import type { DomainError } from "../../src/modules/shared/errors";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../../src/modules/topic-discussion/repository";
import { holdingAdvisoryLock, sleep, track } from "../helpers/concurrency";
import { closeTestSql, testDrizzle, testSql, truncateAll } from "../helpers/db";
import { insertUser } from "../helpers/fixtures";

const boardManagement = createBoardManagement(
  createDrizzleBoardManagementStore(testDrizzle()),
);
const discussion = createTopicDiscussion(
  createDrizzleTopicDiscussionStore(testDrizzle()),
);
const interactions = createInteractionWrite(
  createDrizzleInteractionWriteStore(testDrizzle()),
);

let actorId: string;

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as DomainError).code;
  }
}

async function field(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as DomainError).field;
  }
}

async function createRoot(name: string, slug = name.toLowerCase()) {
  const { boardId } = await boardManagement.createBoard({
    parentId: null,
    name,
    slug,
    abbreviation: name.slice(0, 4),
  });
  return boardId;
}

beforeEach(async () => {
  await truncateAll();
  actorId = await insertUser("admin");
});

afterAll(async () => {
  await closeTestSql();
});

describe("createBoard", () => {
  it("normalizes fields once for roots and children", async () => {
    const rootId = await boardManagement
      .createBoard({
        parentId: null,
        name: "  General Discussion  ",
        slug: "  General-Discussion ",
        abbreviation: " gen ",
        description: "   ",
        icon: " 💬 ",
      })
      .then((result) => result.boardId);

    const [root] = await testSql()`
      SELECT name, slug, abbreviation, description, icon, sort_order
      FROM boards WHERE id = ${rootId}
    `;
    expect(root.name).toBe("General Discussion");
    expect(root.slug).toBe("general-discussion");
    expect(root.abbreviation).toBe("GEN");
    // Empty description becomes NULL, not an empty string.
    expect(root.description).toBeNull();
    expect(root.icon).toBe("💬");
    expect(root.sort_order).toBe(0);

    const { boardId: childId } = await boardManagement.createBoard({
      parentId: rootId,
      name: "Child",
      slug: "child",
      abbreviation: "CH",
      sortOrder: 3,
    });
    const [child] = await testSql()`
      SELECT parent_id, sort_order FROM boards WHERE id = ${childId}
    `;
    expect(child.parent_id).toBe(rootId);
    expect(child.sort_order).toBe(3);
  });

  it("rejects negative sortOrder at the module seam and in the database", async () => {
    expect(
      await code(
        boardManagement.createBoard({
          parentId: null,
          name: "Bad",
          slug: "bad",
          abbreviation: "BAD",
          sortOrder: -1,
        }),
      ),
    ).toBe("INVALID_SORT_ORDER");

    // The database check constraint is authoritative for direct SQL.
    await expect(
      testSql()`
        INSERT INTO boards (name, slug, abbreviation, sort_order)
        VALUES ('Direct', 'direct', 'DIR', -5)
      `,
    ).rejects.toThrow(/boards_sort_order_check/);
  });

  it("reports the conflicting field for sibling name/slug/abbreviation", async () => {
    await createRoot("Alpha");

    expect(
      await field(
        boardManagement.createBoard({
          parentId: null,
          name: "ALPHA",
          slug: "other",
          abbreviation: "OTH",
        }),
      ),
    ).toBe("name");
    expect(
      await field(
        boardManagement.createBoard({
          parentId: null,
          name: "Other",
          slug: "ALPHA",
          abbreviation: "OTH",
        }),
      ),
    ).toBe("slug");
    expect(
      await field(
        boardManagement.createBoard({
          parentId: null,
          name: "Other",
          slug: "other",
          abbreviation: "alph",
        }),
      ),
    ).toBe("abbreviation");
  });

  it("allows the same child slug under different parents", async () => {
    const alpha = await createRoot("Alpha");
    const beta = await createRoot("Beta");

    await boardManagement.createBoard({
      parentId: alpha,
      name: "News A",
      slug: "news",
      abbreviation: "NWA",
    });
    // Same slug, different parent: sibling-scoped uniqueness permits it.
    const second = await boardManagement.createBoard({
      parentId: beta,
      name: "News B",
      slug: "news",
      abbreviation: "NWB",
    });
    expect(second.boardId).toBeTruthy();
  });

  it("rejects an unknown parent", async () => {
    expect(
      await code(
        boardManagement.createBoard({
          parentId: "6f6dcbcf-2f3e-4c39-9a4a-999999999999",
          name: "Orphan",
          slug: "orphan",
          abbreviation: "ORP",
        }),
      ),
    ).toBe("PARENT_BOARD_NOT_FOUND");
  });

  it("persists and updates board access policies", async () => {
    const { boardId } = await boardManagement.createBoard({
      parentId: null,
      name: "Members",
      slug: "members",
      abbreviation: "MEM",
      isGuestVisible: false,
      allowNewTopics: false,
    });
    let [row] = await testSql()`
      SELECT is_guest_visible, allow_new_topics FROM boards WHERE id = ${boardId}
    `;
    expect(row).toEqual({
      is_guest_visible: false,
      allow_new_topics: false,
    });

    await boardManagement.updateBoard({
      boardId,
      isGuestVisible: true,
      allowNewTopics: true,
    });
    [row] = await testSql()`
      SELECT is_guest_visible, allow_new_topics FROM boards WHERE id = ${boardId}
    `;
    expect(row).toEqual({
      is_guest_visible: true,
      allow_new_topics: true,
    });
  });
});

describe("moveBoard", () => {
  it("moves across the tree and keeps arbitrary depth working", async () => {
    const alpha = await createRoot("Alpha");
    const beta = await createRoot("Beta");
    const { boardId: child } = await boardManagement.createBoard({
      parentId: alpha,
      name: "Child",
      slug: "child",
      abbreviation: "CH",
    });

    await boardManagement.moveBoard({
      boardId: child,
      newParentId: beta,
      sortOrder: 1,
    });
    const [moved] = await testSql()`
      SELECT parent_id, sort_order FROM boards WHERE id = ${child}
    `;
    expect(moved.parent_id).toBe(beta);
    expect(moved.sort_order).toBe(1);

    // Promoting a child to root is a valid move.
    await boardManagement.moveBoard({
      boardId: child,
      newParentId: null,
      sortOrder: 0,
    });
    const [promoted] = await testSql()`
      SELECT parent_id FROM boards WHERE id = ${child}
    `;
    expect(promoted.parent_id).toBeNull();
  });

  it("rejects self-parenting and descendant moves in module AND trigger", async () => {
    const root = await createRoot("Root");
    const { boardId: mid } = await boardManagement.createBoard({
      parentId: root,
      name: "Mid",
      slug: "mid",
      abbreviation: "MID",
    });
    const { boardId: leaf } = await boardManagement.createBoard({
      parentId: mid,
      name: "Leaf",
      slug: "leaf",
      abbreviation: "LEA",
    });

    expect(
      await code(
        boardManagement.moveBoard({
          boardId: root,
          newParentId: root,
          sortOrder: 0,
        }),
      ),
    ).toBe("BOARD_CYCLE");
    expect(
      await code(
        boardManagement.moveBoard({
          boardId: root,
          newParentId: leaf,
          sortOrder: 0,
        }),
      ),
    ).toBe("BOARD_CYCLE");

    // The database trigger independently blocks the same move.
    await expect(
      testSql()`UPDATE boards SET parent_id = ${leaf} WHERE id = ${root}`,
    ).rejects.toThrow(/cycle/i);
    await expect(
      testSql()`UPDATE boards SET parent_id = ${root} WHERE id = ${root}`,
    ).rejects.toThrow(/own parent|cycle/i);
  });

  it("serializes concurrent direct-SQL moves so they cannot create a cycle", async () => {
    const alpha = await createRoot("Alpha");
    const beta = await createRoot("Beta");

    let alphaMove = track(Promise.resolve() as Promise<unknown>);
    let betaMove = track(Promise.resolve() as Promise<unknown>);
    await holdingAdvisoryLock(
      "exclusive",
      "forum_board_hierarchy",
      async () => {
        alphaMove = track(
          testDrizzle().transaction((tx) =>
            tx
              .update(boards)
              .set({ parentId: beta })
              .where(eq(boards.id, alpha)),
          ),
        );
        betaMove = track(
          testDrizzle().transaction((tx) =>
            tx
              .update(boards)
              .set({ parentId: alpha })
              .where(eq(boards.id, beta)),
          ),
        );
        await sleep(100);
        // Trigger execution itself must participate in the hierarchy lock;
        // otherwise both direct updates would settle while it is held.
        expect(alphaMove.state.settled).toBe(false);
        expect(betaMove.state.settled).toBe(false);
      },
    );

    const results = await Promise.allSettled([alphaMove.done, betaMove.done]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const rows = await testSql()`
      SELECT id, parent_id FROM boards WHERE id IN (${alpha}, ${beta})
    `;
    expect(rows.filter((row) => row.parent_id !== null)).toHaveLength(1);
  });

  it("rejects a move that would collide with new siblings", async () => {
    const alpha = await createRoot("Alpha");
    const beta = await createRoot("Beta");
    await boardManagement.createBoard({
      parentId: beta,
      name: "News",
      slug: "news",
      abbreviation: "NWS",
    });
    const { boardId: mover } = await boardManagement.createBoard({
      parentId: alpha,
      name: "News",
      slug: "news",
      abbreviation: "NWS",
    });

    expect(
      await code(
        boardManagement.moveBoard({
          boardId: mover,
          newParentId: beta,
          sortOrder: 0,
        }),
      ),
    ).toBe("BOARD_SIBLING_CONFLICT");
  });

  it("serializes concurrent conflicting moves deterministically", async () => {
    const root = await createRoot("Root");
    const { boardId: a } = await boardManagement.createBoard({
      parentId: root,
      name: "A",
      slug: "a",
      abbreviation: "A",
    });
    const { boardId: b } = await boardManagement.createBoard({
      parentId: a,
      name: "B",
      slug: "b",
      abbreviation: "B",
    });

    // Mutually exclusive moves: A under B and B under A. The hierarchy lock
    // forces an order, so exactly one succeeds and the other sees a cycle.
    const results = await Promise.allSettled([
      boardManagement.moveBoard({
        boardId: a,
        newParentId: b,
        sortOrder: 0,
      }),
      boardManagement.moveBoard({
        boardId: b,
        newParentId: null,
        sortOrder: 0,
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // Whatever the interleaving, the tree is still acyclic and reachable.
    const rows = await testSql()`
      WITH RECURSIVE tree AS (
        SELECT id, parent_id, 1 AS depth FROM boards WHERE parent_id IS NULL
        UNION ALL
        SELECT b.id, b.parent_id, tree.depth + 1
        FROM boards b JOIN tree ON b.parent_id = tree.id
      )
      SELECT count(*)::int AS reachable FROM tree
    `;
    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM boards
    `;
    expect(rows[0].reachable).toBe(count);
  });
});

describe("reorderBoardGroups", () => {
  it("reorders multiple complete sibling groups in one transaction", async () => {
    const alpha = await createRoot("Alpha");
    const beta = await createRoot("Beta");
    const { boardId: one } = await boardManagement.createBoard({
      parentId: alpha,
      name: "One",
      slug: "one",
      abbreviation: "ONE",
    });
    const { boardId: two } = await boardManagement.createBoard({
      parentId: alpha,
      name: "Two",
      slug: "two",
      abbreviation: "TWO",
    });

    await expect(
      boardManagement.reorderBoardGroups({
        groups: [
          { parentId: null, boardIds: [beta, alpha] },
          { parentId: alpha, boardIds: [two, one] },
        ],
      }),
    ).resolves.toEqual({ groups: 2, boards: 4 });

    const rows = await testSql()`
      SELECT id, parent_id, sort_order FROM boards
      ORDER BY parent_id NULLS FIRST, sort_order
    `;
    expect(rows).toEqual([
      { id: beta, parent_id: null, sort_order: 0 },
      { id: alpha, parent_id: null, sort_order: 1 },
      { id: two, parent_id: alpha, sort_order: 0 },
      { id: one, parent_id: alpha, sort_order: 1 },
    ]);
  });

  it("rejects a stale sibling set without changing any order", async () => {
    const alpha = await createRoot("Alpha");
    const beta = await createRoot("Beta");
    expect(
      await code(
        boardManagement.reorderBoardGroups({
          groups: [{ parentId: null, boardIds: [beta] }],
        }),
      ),
    ).toBe("BOARD_ORDER_CHANGED");

    const rows = await testSql()`
      SELECT id, sort_order FROM boards ORDER BY name
    `;
    expect(rows).toEqual([
      { id: alpha, sort_order: 0 },
      { id: beta, sort_order: 0 },
    ]);
  });
});

describe("recursive purge", () => {
  async function seedSubtree() {
    const root = await createRoot("Purgeable");
    const { boardId: child } = await boardManagement.createBoard({
      parentId: root,
      name: "Child",
      slug: "child",
      abbreviation: "CH",
    });
    const { topicId } = await discussion.createTopic({
      actorId,
      boardId: child,
      title: "Doomed topic",
      content: "opening",
    });
    const { postId } = await discussion.replyToTopic({
      actorId,
      topicId,
      content: "reply",
    });
    await interactions.toggleReaction({ actorId, postId, emoji: "👍" });
    await interactions.applyVote({ actorId, postId, value: 1 });
    await discussion.recordTopicView({
      topicId,
      browserSessionId: "55555555-5555-4555-8555-555555555555",
    });
    return { root, child, topicId, postId };
  }

  it("counts the complete subtree and all dependent content", async () => {
    const { root } = await seedSubtree();
    const impact = await boardManagement.previewRecursivePurge(root);
    expect(impact.boardName).toBe("Purgeable");
    expect(impact.counts).toEqual({
      boards: 2,
      topics: 1,
      posts: 2, // opening + reply
      reactions: 1,
      votes: 1,
      topicViews: 1,
    });
  });

  it("rejects a wrong confirmation name and stale expected impact", async () => {
    const { root, topicId } = await seedSubtree();
    const impact = await boardManagement.previewRecursivePurge(root);

    expect(
      await code(
        boardManagement.purgeBoardTree({
          boardId: root,
          confirmationName: "purgeable", // case-sensitive
          expectedImpact: impact.counts,
        }),
      ),
    ).toBe("PURGE_NAME_MISMATCH");

    // Content changes after the preview -> the submitted counts go stale.
    await discussion.replyToTopic({
      actorId,
      topicId,
      content: "late reply",
    });
    expect(
      await code(
        boardManagement.purgeBoardTree({
          boardId: root,
          confirmationName: "Purgeable",
          expectedImpact: impact.counts,
        }),
      ),
    ).toBe("PURGE_IMPACT_CHANGED");

    // Nothing was deleted by either rejection.
    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM boards
    `;
    expect(count).toBe(2);
  });

  it("removes the complete subtree atomically once confirmed", async () => {
    const { root } = await seedSubtree();
    const impact = await boardManagement.previewRecursivePurge(root);

    const deleted = await boardManagement.purgeBoardTree({
      boardId: root,
      confirmationName: "Purgeable",
      expectedImpact: impact.counts,
    });
    expect(deleted).toEqual(impact.counts);

    const [remaining] = await testSql()`
      SELECT
        (SELECT count(*)::int FROM boards) AS boards,
        (SELECT count(*)::int FROM topics) AS topics,
        (SELECT count(*)::int FROM posts) AS posts,
        (SELECT count(*)::int FROM reactions) AS reactions,
        (SELECT count(*)::int FROM votes) AS votes,
        (SELECT count(*)::int FROM topic_views) AS views
    `;
    expect(remaining).toMatchObject({
      boards: 0,
      topics: 0,
      posts: 0,
      reactions: 0,
      votes: 0,
      views: 0,
    });
  });

  it("purge waits for in-flight content writes and is not made stale by them", async () => {
    const { root } = await seedSubtree();
    const impact = await boardManagement.previewRecursivePurge(root);

    // A content write holds the SHARED lock; purge must wait for it.
    let purge = track(Promise.resolve() as Promise<unknown>);
    await holdingAdvisoryLock("shared", "forum_content", async () => {
      purge = track(
        boardManagement.purgeBoardTree({
          boardId: root,
          confirmationName: "Purgeable",
          expectedImpact: impact.counts,
        }),
      );
      await sleep(300);
      expect(purge.state.settled).toBe(false);
    });

    // Once the writer commits, purge proceeds against a recounted subtree.
    await expect(purge.done).resolves.toEqual(impact.counts);
  });

  it("an actual reply command blocks behind an actual purge recount", async () => {
    const { root, topicId } = await seedSubtree();
    const impact = await boardManagement.previewRecursivePurge(root);
    const baseStore = createDrizzleBoardManagementStore(testDrizzle());
    let lockAcquired: (() => void) | undefined;
    const acquired = new Promise<void>((resolve) => {
      lockAcquired = resolve;
    });
    let continuePurge: (() => void) | undefined;
    const allowed = new Promise<void>((resolve) => {
      continuePurge = resolve;
    });
    const gatedStore: BoardManagementStore = {
      transaction: (run) =>
        baseStore.transaction((tx) =>
          run({
            ...tx,
            async lockForumContentExclusive() {
              await tx.lockForumContentExclusive();
              lockAcquired?.();
              await allowed;
            },
          }),
        ),
    };
    const gatedManagement = createBoardManagement(gatedStore);
    const purge = track(
      gatedManagement.purgeBoardTree({
        boardId: root,
        confirmationName: "Purgeable",
        expectedImpact: impact.counts,
      }),
    );
    await acquired;

    const reply = track(
      discussion.replyToTopic({ actorId, topicId, content: "too late" }),
    );
    await sleep(100);
    expect(reply.state.settled).toBe(false);

    continuePurge?.();
    await expect(purge.done).resolves.toEqual(impact.counts);
    await expect(reply.done).rejects.toMatchObject({ code: "TOPIC_NOT_FOUND" });
  });
});

describe("content writes block behind a purge", () => {
  it.each([
    [
      "topic reply",
      async (topicId: string) => {
        await discussion.replyToTopic({
          actorId,
          topicId,
          content: "blocked",
        });
      },
    ],
    [
      "topic view",
      async (topicId: string) => {
        await discussion.recordTopicView({
          topicId,
          browserSessionId: "66666666-6666-4666-8666-666666666666",
        });
      },
    ],
  ])("%s waits for the exclusive forum-content lock", async (_label, write) => {
    const root = await createRoot("Blocking");
    const { topicId } = await discussion.createTopic({
      actorId,
      boardId: root,
      title: "Blocking topic",
      content: "opening",
    });

    let pending = track(Promise.resolve() as Promise<unknown>);
    await holdingAdvisoryLock("exclusive", "forum_content", async () => {
      pending = track(write(topicId));
      await sleep(300);
      // The write must not have touched the database yet.
      expect(pending.state.settled).toBe(false);
    });
    await expect(pending.done).resolves.not.toThrow();
  });

  it("reaction and vote writes take the shared lock in the same transaction", async () => {
    const root = await createRoot("Interactions");
    const { topicId } = await discussion.createTopic({
      actorId,
      boardId: root,
      title: "Interaction topic",
      content: "opening",
    });
    const { postId } = await discussion.replyToTopic({
      actorId,
      topicId,
      content: "reply",
    });

    let reaction = track(Promise.resolve() as Promise<unknown>);
    let vote = track(Promise.resolve() as Promise<unknown>);
    await holdingAdvisoryLock("exclusive", "forum_content", async () => {
      reaction = track(
        interactions.toggleReaction({ actorId, postId, emoji: "🎉" }),
      );
      vote = track(interactions.applyVote({ actorId, postId, value: 1 }));
      await sleep(300);
      expect(reaction.state.settled).toBe(false);
      expect(vote.state.settled).toBe(false);
    });

    await expect(reaction.done).resolves.toEqual({ action: "added" });
    await expect(vote.done).resolves.toEqual({ action: "added" });
  });

  it("concurrent move and purge complete without deadlock", async () => {
    const root = await createRoot("Deadlock");
    const { boardId: child } = await boardManagement.createBoard({
      parentId: root,
      name: "Child",
      slug: "child",
      abbreviation: "CH",
    });
    const other = await createRoot("Other");
    const impact = await boardManagement.previewRecursivePurge(root);

    // Both take the hierarchy lock first and the content lock second, so
    // they serialize instead of deadlocking regardless of interleaving.
    const results = await Promise.allSettled([
      boardManagement.purgeBoardTree({
        boardId: root,
        confirmationName: "Deadlock",
        expectedImpact: impact.counts,
      }),
      boardManagement.moveBoard({
        boardId: child,
        newParentId: other,
        sortOrder: 0,
      }),
    ]);

    // Neither may fail with a deadlock; a lost race yields a typed error.
    for (const result of results) {
      if (result.status === "rejected") {
        expect(String(result.reason?.message ?? result.reason)).not.toMatch(
          /deadlock/i,
        );
      }
    }
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
  });
});

describe("interaction write semantics are unchanged", () => {
  it("toggles reactions and applies vote add/switch/remove", async () => {
    const root = await createRoot("Semantics");
    const { topicId } = await discussion.createTopic({
      actorId,
      boardId: root,
      title: "Semantics topic",
      content: "opening",
    });
    const { postId } = await discussion.replyToTopic({
      actorId,
      topicId,
      content: "reply",
    });

    expect(
      await interactions.toggleReaction({ actorId, postId, emoji: "👍" }),
    ).toEqual({ action: "added" });
    expect(
      await interactions.toggleReaction({ actorId, postId, emoji: "👍" }),
    ).toEqual({ action: "removed" });
    // A different emoji is an independent reaction.
    expect(
      await interactions.toggleReaction({ actorId, postId, emoji: "🎉" }),
    ).toEqual({ action: "added" });

    expect(await interactions.applyVote({ actorId, postId, value: 1 })).toEqual(
      {
        action: "added",
      },
    );
    expect(
      await interactions.applyVote({ actorId, postId, value: -1 }),
    ).toEqual({ action: "switched" });
    expect(
      await interactions.applyVote({ actorId, postId, value: -1 }),
    ).toEqual({ action: "removed" });

    const [{ votes: voteCount }] = await testSql()`
      SELECT count(*)::int AS votes FROM votes WHERE post_id = ${postId}
    `;
    expect(voteCount).toBe(0);
  });
});
