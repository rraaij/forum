/*
 * Forum read model integration tests (refactor plan section 8.3).
 * Fixtures are created through the real TopicDiscussion module so counters
 * and opening posts match production writes; timestamps are pinned via SQL
 * where determinism requires it.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createForumReadModel } from "../../src/modules/forum-read/queries";
import { createForumReadStore } from "../../src/modules/forum-read/repository";
import type { DomainError } from "../../src/modules/shared/errors";
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

const readModel = createForumReadModel(createForumReadStore(testDrizzle()));
const discussion = createTopicDiscussion(
  createDrizzleTopicDiscussionStore(testDrizzle()),
);

let authorId: string;

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as DomainError).code;
  }
}

/** Root A > B > C > D > E, plus root Other with slug-reused children. */
async function buildDeepTree() {
  const a = await insertBoard("Alpha");
  const b = await insertBoard("Bravo", a);
  const c = await insertBoard("Charlie", b);
  const d = await insertBoard("Delta", c);
  const e = await insertBoard("Echo", d);
  const other = await insertBoard("Other");
  // Sibling-scoped slug reuse: same child slug under two different parents.
  await testSql()`
    INSERT INTO boards (parent_id, name, slug, abbreviation)
    VALUES (${a}, 'Shared A', 'shared', 'SHA'), (${other}, 'Shared O', 'shared', 'SHO')
  `;
  return { a, b, c, d, e, other };
}

beforeEach(async () => {
  await truncateAll();
  authorId = await insertUser("reader");
});

afterAll(async () => {
  await closeTestSql();
});

describe("forum index", () => {
  it("returns an empty forum", async () => {
    const index = await readModel.getForumIndex();
    expect(index.categories).toEqual([]);
  });

  it("returns a root-only board with zero counts", async () => {
    await insertBoard("Solo");
    const index = await readModel.getForumIndex();
    expect(index.categories).toHaveLength(1);
    expect(index.categories[0]).toMatchObject({
      name: "Solo",
      directTopicCount: 0,
      totalTopicCount: 0,
      latestActivity: null,
      children: [],
    });
  });

  it("nests a five-level tree with recursive counts and rolled-up activity", async () => {
    const tree = await buildDeepTree();
    await discussion.createTopic({
      actorId: authorId,
      boardId: tree.a,
      title: "On alpha",
      content: "x",
    });
    await discussion.createTopic({
      actorId: authorId,
      boardId: tree.c,
      title: "On charlie",
      content: "x",
    });
    await discussion.createTopic({
      actorId: authorId,
      boardId: tree.e,
      title: "On echo one",
      content: "x",
    });
    const newest = await discussion.createTopic({
      actorId: authorId,
      boardId: tree.e,
      title: "On echo two",
      content: "x",
    });

    const index = await readModel.getForumIndex();
    const alpha = index.categories.find((cat) => cat.name === "Alpha");
    expect(alpha).toBeDefined();
    if (!alpha) return;
    expect(alpha.directTopicCount).toBe(1);
    expect(alpha.totalTopicCount).toBe(4);
    // Five levels: Alpha > Bravo > Charlie > Delta > Echo.
    const bravo = alpha.children.find((child) => child.name === "Bravo");
    const charlie = bravo?.children[0];
    const delta = charlie?.children[0];
    const echo = delta?.children[0];
    expect(echo?.name).toBe("Echo");
    expect(charlie?.totalTopicCount).toBe(3);
    expect(echo?.totalTopicCount).toBe(2);
    // Latest activity rolls up to the root and carries canonical params.
    expect(alpha.latestActivity?.topicTitle).toBe("On echo two");
    expect(alpha.latestActivity?.routeParams).toEqual({
      kind: "boardTopic",
      categorySlug: "alpha",
      boardId: tree.e,
      topicSlug: newest.slug,
    });
  });

  it("orders siblings by sortOrder then name", async () => {
    await testSql()`
      INSERT INTO boards (name, slug, abbreviation, sort_order) VALUES
      ('Zeta', 'zeta', 'Z', 0), ('Anna', 'anna', 'A', 0), ('First', 'first', 'F', 1)
    `;
    const index = await readModel.getForumIndex();
    expect(index.categories.map((cat) => cat.name)).toEqual([
      "Anna",
      "Zeta",
      "First",
    ]);
  });
});

describe("category and board pages", () => {
  it("finds root categories case-insensitively", async () => {
    await buildDeepTree();
    const page = await readModel.getCategoryPage({
      categorySlug: "ALPHA",
      topics: {},
    });
    expect(page.category.name).toBe("Alpha");
    expect(page.breadcrumbs).toHaveLength(1);
    expect(page.childBoards.map((child) => child.name)).toEqual([
      "Bravo",
      "Shared A",
    ]);
  });

  it("returns not found for unknown categories and ancestry mismatches", async () => {
    const tree = await buildDeepTree();
    expect(
      await code(
        readModel.getCategoryPage({ categorySlug: "nope", topics: {} }),
      ),
    ).toBe("CATEGORY_NOT_FOUND");
    // Board B belongs to Alpha, not Other.
    expect(
      await code(
        readModel.getBoardPage({
          categorySlug: "other",
          boardId: tree.b,
          topics: {},
        }),
      ),
    ).toBe("BOARD_NOT_FOUND");
    // Root boards are addressed by the category path only.
    expect(
      await code(
        readModel.getBoardPage({
          categorySlug: "alpha",
          boardId: tree.a,
          topics: {},
        }),
      ),
    ).toBe("BOARD_NOT_FOUND");
  });

  it("returns board pages with full breadcrumb ancestry", async () => {
    const tree = await buildDeepTree();
    const page = await readModel.getBoardPage({
      categorySlug: "alpha",
      boardId: tree.e,
      topics: {},
    });
    expect(page.breadcrumbs.map((crumb) => crumb.slug)).toEqual([
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
    ]);
    expect(page.breadcrumbs[0].isRoot).toBe(true);
  });
});

describe("topic pagination", () => {
  let boardId: string;

  beforeEach(async () => {
    boardId = await insertBoard("Paged");
  });

  async function makeTopics(n: number): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < n; i++) {
      const { topicId } = await discussion.createTopic({
        actorId: authorId,
        boardId,
        title: `Paged topic ${i}`,
        content: "x",
      });
      ids.push(topicId);
    }
    return ids;
  }

  async function walkTopicPages(limit: number): Promise<string[]> {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 20; guard++) {
      const page = await readModel.getCategoryPage({
        categorySlug: "paged",
        topics: { cursor, limit },
      });
      for (const item of page.topics.items) seen.push(item.id);
      if (!page.topics.nextCursor) break;
      cursor = page.topics.nextCursor;
    }
    return seen;
  }

  it("walks adjacent pages without duplicate or missing IDs", async () => {
    const ids = await makeTopics(5);
    const seen = await walkTopicPages(2);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
    expect(new Set(seen)).toEqual(new Set(ids));
  });

  it("breaks equal activity timestamps deterministically by id", async () => {
    await makeTopics(4);
    await testSql()`
      UPDATE topics SET last_activity_at = '2026-07-20 12:00:00'
    `;
    const first = await walkTopicPages(1);
    const second = await walkTopicPages(1);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(4);
    // DESC id order within the tied timestamp.
    expect(first).toEqual([...first].sort().reverse());
  });

  it("does not repeat a topic that gains activity ahead of the cursor", async () => {
    const ids = await makeTopics(4);
    const page1 = await readModel.getCategoryPage({
      categorySlug: "paged",
      topics: { limit: 2 },
    });
    const accumulated = page1.topics.items.map((item) => item.id);

    // A topic already rendered gains new activity: it moves AHEAD of the
    // cursor in the live feed and must not appear again while paging on.
    const bumped = accumulated[1];
    await discussion.replyToTopic({
      actorId: authorId,
      topicId: bumped,
      content: "bump",
    });

    let cursor = page1.topics.nextCursor ?? undefined;
    while (cursor) {
      const page = await readModel.getCategoryPage({
        categorySlug: "paged",
        topics: { cursor, limit: 2 },
      });
      for (const item of page.topics.items) {
        expect(accumulated).not.toContain(item.id);
        accumulated.push(item.id);
      }
      cursor = page.topics.nextCursor ?? undefined;
    }
    // The bumped topic is simply not revisited; everything else arrived once.
    expect(new Set(accumulated).size).toBe(ids.length);
  });

  it("documents the live-feed case the frontend deduplicates: activity moving backwards", async () => {
    const ids = await makeTopics(3);
    // The oldest topic is bumped to the top by a reply, gets rendered on
    // page 1 (cursor taken at its elevated activity), and then loses that
    // reply — its activity moves strictly BEHIND the cursor.
    const { postId } = await discussion.replyToTopic({
      actorId: authorId,
      topicId: ids[0],
      content: "temp",
    });
    const page1 = await readModel.getCategoryPage({
      categorySlug: "paged",
      topics: { limit: 1 },
    });
    const rendered = page1.topics.items[0];
    expect(rendered.id).toBe(ids[0]);
    await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId,
    });
    // Deleting the newest reply moved lastActivityAt BACK to creation time;
    // the topic can reappear behind the cursor. The read model returns it
    // (live feed by design); the frontend drops the repeated ID.
    const rest = await readModel.getCategoryPage({
      categorySlug: "paged",
      topics: { cursor: page1.topics.nextCursor ?? undefined, limit: 10 },
    });
    expect(rest.topics.items.map((item) => item.id)).toContain(rendered.id);
  });

  it("rejects tampered cursors, wrong cursor kinds, and bad limits", async () => {
    await makeTopics(1);
    expect(
      await code(
        readModel.getCategoryPage({
          categorySlug: "paged",
          topics: { cursor: "garbage!" },
        }),
      ),
    ).toBe("INVALID_CURSOR");
    expect(
      await code(
        readModel.getCategoryPage({
          categorySlug: "paged",
          topics: { limit: 101 },
        }),
      ),
    ).toBe("INVALID_PAGE_LIMIT");
  });
});

describe("topic page", () => {
  it("resolves globally unique slugs with explicit opening post and ordered replies", async () => {
    const tree = await buildDeepTree();
    const created = await discussion.createTopic({
      actorId: authorId,
      boardId: tree.e,
      title: "Deep discussion",
      content: "the opening",
    });
    await discussion.replyToTopic({
      actorId: authorId,
      topicId: created.topicId,
      content: "first reply",
    });
    const { postId } = await discussion.replyToTopic({
      actorId: authorId,
      topicId: created.topicId,
      content: "second reply",
    });
    await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId,
    });

    const page = await readModel.getTopicPage({
      topicSlug: "DEEP-DISCUSSION",
      replies: {},
    });
    expect(page.openingPost.kind).toBe("opening");
    expect(page.openingPost.content).toBe("the opening");
    expect(page.topic.replyCount).toBe(1);
    // Active and deleted replies, in (createdAt, id) order.
    expect(page.replies.items.map((reply) => reply.isDeleted)).toEqual([
      false,
      true,
    ]);
    expect(page.routeParams).toEqual({
      kind: "boardTopic",
      categorySlug: "alpha",
      boardId: tree.e,
      topicSlug: created.slug,
    });
    expect(page.breadcrumbs).toHaveLength(5);

    expect(
      await code(readModel.getTopicPage({ topicSlug: "missing", replies: {} })),
    ).toBe("TOPIC_NOT_FOUND");
  });

  it("returns the immutable quote snapshot on quoting replies", async () => {
    const boardId = await insertBoard("QuoteBoard");
    const { topicId, slug } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Quote carrier",
      content: "the source post",
    });
    const [opening] = await testSql()`
      SELECT id FROM posts WHERE topic_id = ${topicId} AND kind = 'opening'
    `;
    await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "quoting the opening",
      quotedPostId: opening.id as string,
    });

    const page = await readModel.getTopicPage({ topicSlug: slug, replies: {} });
    const reply = page.replies.items[0];
    expect(reply.quote).not.toBeNull();
    expect(reply.quote?.content).toBe("the source post");
    expect(reply.quote?.authorName).toBe("reader");

    // Editing the source must NOT change the snapshot.
    await discussion.editPost({
      actor: { id: authorId, role: "user" },
      postId: opening.id as string,
      content: "edited source",
    });
    const after = await readModel.getTopicPage({
      topicSlug: slug,
      replies: {},
    });
    expect(after.replies.items[0].quote?.content).toBe("the source post");
  });

  it("pages replies without duplicating or skipping late inserts", async () => {
    const boardId = await insertBoard("ReplyBoard");
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Reply paging",
      content: "opening",
    });
    for (let i = 0; i < 3; i++) {
      await discussion.replyToTopic({
        actorId: authorId,
        topicId,
        content: `early ${i}`,
      });
    }

    const page1 = await readModel.getTopicPage({
      topicSlug: "reply-paging",
      replies: { limit: 2 },
    });
    expect(page1.replies.items).toHaveLength(2);

    // Replies inserted AFTER the cursor was taken must still be reached.
    await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "late",
    });

    const seen = page1.replies.items.map((reply) => reply.id);
    let cursor = page1.replies.nextCursor ?? undefined;
    while (cursor) {
      const page = await readModel.getTopicPage({
        topicSlug: "reply-paging",
        replies: { cursor, limit: 2 },
      });
      for (const reply of page.replies.items) {
        expect(seen).not.toContain(reply.id);
        seen.push(reply.id);
      }
      cursor = page.replies.nextCursor ?? undefined;
    }
    expect(seen).toHaveLength(4);
    const contents = await testSql()`
      SELECT count(*)::int AS count FROM posts
      WHERE topic_id = ${topicId} AND kind = 'reply'
    `;
    expect(contents[0].count).toBe(4);
  });

  it("normalizes sub-millisecond timestamps before building reply cursors", async () => {
    const boardId = await insertBoard("PrecisionBoard");
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Precision paging",
      content: "opening",
    });
    await testSql()`
      INSERT INTO posts (topic_id, author_id, content, kind, created_at)
      VALUES
        (${topicId}, ${authorId}, 'micro one', 'reply', '2026-07-25 10:00:00.123100'),
        (${topicId}, ${authorId}, 'micro two', 'reply', '2026-07-25 10:00:00.123900')
    `;

    const stored = await testSql()`
      SELECT id, to_char(created_at, 'US') AS microseconds
      FROM posts
      WHERE topic_id = ${topicId} AND kind = 'reply'
      ORDER BY created_at, id
    `;
    expect(stored.map((row) => row.microseconds)).toEqual(["123000", "124000"]);

    const first = await readModel.getTopicPage({
      topicSlug: "precision-paging",
      replies: { limit: 1 },
    });
    const second = await readModel.getTopicPage({
      topicSlug: "precision-paging",
      replies: { limit: 1, cursor: first.replies.nextCursor ?? undefined },
    });
    expect([first.replies.items[0]?.id, second.replies.items[0]?.id]).toEqual(
      stored.map((row) => row.id),
    );
  });

  it("normalizes sub-millisecond activity before building topic cursors", async () => {
    const boardId = await insertBoard("TopicPrecision");
    const firstTopic = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Precision topic one",
      content: "opening",
    });
    const secondTopic = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Precision topic two",
      content: "opening",
    });
    await testSql()`
      UPDATE topics
      SET last_activity_at = CASE id
        WHEN ${firstTopic.topicId} THEN '2026-07-25 10:00:00.123100'::timestamp
        ELSE '2026-07-25 10:00:00.123900'::timestamp
      END
      WHERE id IN (${firstTopic.topicId}, ${secondTopic.topicId})
    `;
    const stored = await testSql()`
      SELECT id FROM topics WHERE board_id = ${boardId}
      ORDER BY is_pinned DESC, last_activity_at DESC, id DESC
    `;

    const first = await readModel.getCategoryPage({
      categorySlug: "topicprecision",
      topics: { limit: 1 },
    });
    const second = await readModel.getCategoryPage({
      categorySlug: "topicprecision",
      topics: { limit: 1, cursor: first.topics.nextCursor ?? undefined },
    });
    expect([first.topics.items[0]?.id, second.topics.items[0]?.id]).toEqual(
      stored.map((row) => row.id),
    );
  });

  it("rejects a reply cursor that carries a topic-cursor payload", async () => {
    const boardId = await insertBoard("CursorKind");
    await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Cursor kind",
      content: "x",
    });
    const page = await readModel.getCategoryPage({
      categorySlug: "cursorkind",
      topics: { limit: 1 },
    });
    // Force a next cursor by asking for a page of size 0+1 — instead build
    // a topic cursor by hand from the returned item.
    const item = page.topics.items[0];
    const topicCursor = Buffer.from(
      JSON.stringify({
        version: 1,
        isPinned: item.isPinned,
        lastActivityAt: item.lastActivityAt,
        id: item.id,
      }),
    ).toString("base64url");
    expect(
      await code(
        readModel.getTopicPage({
          topicSlug: "cursor-kind",
          replies: { cursor: topicCursor },
        }),
      ),
    ).toBe("INVALID_CURSOR");
  });
});

describe("query budget", () => {
  it("keeps hierarchy and topics in one snapshot during a concurrent purge", async () => {
    const boardId = await insertBoard("Snapshot");
    await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Visible together",
      content: "x",
    });

    const baseStore = createForumReadStore(testDrizzle());
    const consistent = createForumReadModel({
      transaction: (run) =>
        baseStore.transaction((tx) =>
          run({
            ...tx,
            async allBoards() {
              const rows = await tx.allBoards();
              // Commit a cascade on another connection after this
              // transaction has established its repeatable-read snapshot.
              await testSql()`DELETE FROM boards WHERE id = ${boardId}`;
              return rows;
            },
          }),
        ),
    });

    const index = await consistent.getForumIndex();
    expect(index.categories[0]?.totalTopicCount).toBe(1);
    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM boards WHERE id = ${boardId}
    `;
    expect(count).toBe(0);
  });

  it("keeps every page within a fixed query count on a deep tree", async () => {
    const tree = await buildDeepTree();
    const created = await discussion.createTopic({
      actorId: authorId,
      boardId: tree.e,
      title: "Budget topic",
      content: "x",
    });

    const counter = { count: 0 };
    const counted = createForumReadModel(
      createForumReadStore(countingDrizzle(counter)),
    );

    counter.count = 0;
    await counted.getForumIndex();
    expect(counter.count).toBeLessThanOrEqual(4);

    counter.count = 0;
    await counted.getCategoryPage({ categorySlug: "alpha", topics: {} });
    expect(counter.count).toBeLessThanOrEqual(5);

    counter.count = 0;
    await counted.getBoardPage({
      categorySlug: "alpha",
      boardId: tree.e,
      topics: {},
    });
    expect(counter.count).toBeLessThanOrEqual(5);

    counter.count = 0;
    await counted.getTopicPage({ topicSlug: created.slug, replies: {} });
    expect(counter.count).toBeLessThanOrEqual(7);
  });
});
