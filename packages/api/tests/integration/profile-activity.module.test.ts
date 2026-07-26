/*
 * Profile activity integration tests (refactor plan sections 5.5 and 8.3).
 * Fixtures are written through the real TopicDiscussion module so post kinds
 * and deletion state are exactly what production writes.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createProfileActivity } from "../../src/modules/profile-activity/queries";
import { createProfileActivityStore } from "../../src/modules/profile-activity/repository";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../../src/modules/topic-discussion/repository";
import {
  closeTestSql,
  countingDrizzle,
  testDrizzle,
  testSql,
  truncateAll,
} from "../helpers/db";
import { insertBoard, insertUser } from "../helpers/fixtures";

const activity = createProfileActivity(
  createProfileActivityStore(testDrizzle()),
);
const discussion = createTopicDiscussion(
  createDrizzleTopicDiscussionStore(testDrizzle()),
);

let authorId: string;
let otherId: string;

beforeEach(async () => {
  await truncateAll();
  authorId = await insertUser("activity-author");
  otherId = await insertUser("activity-other");
});

afterAll(async () => {
  await closeTestSql();
});

describe("post kind and deletion state come from the row, not its position", () => {
  it("marks the opening post opening and replies reply", async () => {
    const board = await insertBoard("Alpha");
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId: board,
      title: "Kinds",
      content: "opening body",
    });
    await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "first reply",
    });

    const items = await activity.getAllForUser(authorId);
    const byContent = new Map(items.map((item) => [item.postContent, item]));
    expect(byContent.get("opening body")?.postKind).toBe("opening");
    expect(byContent.get("first reply")?.postKind).toBe("reply");
  });

  /*
   * The legacy query inferred the opening post from row_number() over the
   * author's own posts, so a reply to someone else's topic ranked first and
   * was mislabelled an opening post. Explicit kind removes the inference.
   */
  it("does not call a reply to another author's topic an opening post", async () => {
    const board = await insertBoard("Alpha");
    const { topicId } = await discussion.createTopic({
      actorId: otherId,
      boardId: board,
      title: "Not mine",
      content: "theirs",
    });
    await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "my only post here",
    });

    const items = await activity.getAllForUser(authorId);
    expect(items).toHaveLength(1);
    expect(items[0].postKind).toBe("reply");
  });

  it("returns a soft-deleted reply with its deletion state", async () => {
    const board = await insertBoard("Alpha");
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId: board,
      title: "Deletions",
      content: "opening",
    });
    const { postId } = await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "regrettable",
    });
    await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId,
    });

    const items = await activity.getAllForUser(authorId);
    // The row is returned, flagged; presentation is the UI's decision.
    expect(items).toHaveLength(2);
    const deleted = items.find((item) => item.postId === postId);
    expect(deleted?.isDeleted).toBe(true);
  });
});

describe("canonical route params and breadcrumbs", () => {
  it("links a root-board topic through the category path", async () => {
    const root = await insertBoard("Alpha");
    await discussion.createTopic({
      actorId: authorId,
      boardId: root,
      title: "Root topic",
      content: "x",
    });

    const [item] = await activity.getAllForUser(authorId);
    expect(item.routeParams).toEqual({
      kind: "rootTopic",
      categorySlug: "alpha",
      topicSlug: item.topicSlug,
    });
    expect(item.breadcrumbs).toEqual([
      { boardId: root, name: "Alpha", slug: "alpha", isRoot: true },
    ]);
  });

  it("links a deeply nested topic through its root category and board id", async () => {
    const a = await insertBoard("Alpha");
    const b = await insertBoard("Bravo", a);
    const c = await insertBoard("Charlie", b);
    const d = await insertBoard("Delta", c);
    await discussion.createTopic({
      actorId: authorId,
      boardId: d,
      title: "Deep topic",
      content: "x",
    });

    const [item] = await activity.getAllForUser(authorId);
    expect(item.routeParams).toEqual({
      kind: "boardTopic",
      categorySlug: "alpha",
      boardId: d,
      topicSlug: item.topicSlug,
    });
    expect(item.breadcrumbs.map((crumb) => crumb.slug)).toEqual([
      "alpha",
      "bravo",
      "charlie",
      "delta",
    ]);
    expect(item.breadcrumbs.map((crumb) => crumb.isRoot)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it("keeps posts and hierarchy in one snapshot during a concurrent purge", async () => {
    const board = await insertBoard("Alpha");
    const created = await discussion.createTopic({
      actorId: authorId,
      boardId: board,
      title: "Consistent snapshot",
      content: "x",
    });

    const baseStore = createProfileActivityStore(testDrizzle());
    const consistent = createProfileActivity({
      transaction: (run) =>
        baseStore.transaction((tx) =>
          run({
            async postsByAuthor(userId) {
              const rows = await tx.postsByAuthor(userId);
              // The board and its content disappear on another connection
              // before the hierarchy query, but not from this snapshot.
              await testSql()`DELETE FROM boards WHERE id = ${board}`;
              return rows;
            },
            hierarchyBoards: () => tx.hierarchyBoards(),
          }),
        ),
    });

    const [item] = await consistent.getAllForUser(authorId);
    expect(item.routeParams).toEqual(created.routeParams);
    expect(item.breadcrumbs.map((crumb) => crumb.slug)).toEqual(["alpha"]);
    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM boards WHERE id = ${board}
    `;
    expect(count).toBe(0);
  });
});

describe("scope and ordering", () => {
  it("returns only the requested author's posts, newest first", async () => {
    const board = await insertBoard("Alpha");
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId: board,
      title: "Shared",
      content: "mine first",
    });
    await discussion.replyToTopic({
      actorId: otherId,
      topicId,
      content: "not mine",
    });
    await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "mine second",
    });

    const items = await activity.getAllForUser(authorId);
    expect(items.map((item) => item.postContent)).toEqual([
      "mine second",
      "mine first",
    ]);
  });
});

/*
 * Returning ALL activity is a recorded decision (plan section 5.5), so the
 * cost is measured rather than assumed: a fixed query count regardless of
 * volume, and a duration recorded for the large fixture.
 */
describe("large fixture", () => {
  const TOPIC_COUNT = 40;
  const REPLIES_PER_TOPIC = 5;
  const EXPECTED_ROWS = TOPIC_COUNT * (1 + REPLIES_PER_TOPIC);

  it("returns every row in a fixed number of queries", async () => {
    const root = await insertBoard("Alpha");
    let parent = root;
    // Five levels deep, so ancestry work is not trivially shallow.
    for (const name of ["Bravo", "Charlie", "Delta", "Echo"]) {
      parent = await insertBoard(name, parent);
    }

    for (let t = 0; t < TOPIC_COUNT; t += 1) {
      const { topicId } = await discussion.createTopic({
        actorId: authorId,
        boardId: t % 2 === 0 ? root : parent,
        title: `Fixture topic ${t}`,
        content: "opening",
      });
      for (let r = 0; r < REPLIES_PER_TOPIC; r += 1) {
        await discussion.replyToTopic({
          actorId: authorId,
          topicId,
          content: `reply ${r}`,
        });
      }
    }

    const counter = { count: 0 };
    const counted = createProfileActivity(
      createProfileActivityStore(countingDrizzle(counter)),
    );

    const startedAt = performance.now();
    const items = await counted.getAllForUser(authorId);
    const durationMs = performance.now() - startedAt;

    expect(items).toHaveLength(EXPECTED_ROWS);
    // Transaction setup + posts + boards. Never one query per topic, board,
    // or ancestry level.
    expect(counter.count).toBe(3);
    expect(items.every((item) => item.routeParams !== null)).toBe(true);

    // Recorded, not asserted as a threshold: timings vary by machine.
    console.info(
      `profile activity: ${items.length} rows in ${durationMs.toFixed(1)}ms (${counter.count} queries)`,
    );
  });
});
