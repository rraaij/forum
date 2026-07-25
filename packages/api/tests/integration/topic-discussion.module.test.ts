/*
 * Topic discussion module integration tests (refactor plan section 8.3).
 * These run against the real forum_test database: transactions, row locks,
 * counters, quote snapshots, and failure injection between related writes.
 */

import { dbTargetFromEnv } from "@forum/db/safe-target";
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { DomainError } from "../../src/modules/shared/errors";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import {
  createDrizzleTopicDiscussionStore,
  type TopicDiscussionStore,
  type TopicDiscussionTx,
} from "../../src/modules/topic-discussion/repository";
import { closeTestSql, testDrizzle, testSql, truncateAll } from "../helpers/db";
import { insertBoard, insertUser } from "../helpers/fixtures";

const store = createDrizzleTopicDiscussionStore(testDrizzle());
const discussion = createTopicDiscussion(store);

let boardId: string;
let authorId: string;

/** Wraps the store so ONE tx operation throws — proves atomic rollback. */
function storeFailingAt(method: keyof TopicDiscussionTx): TopicDiscussionStore {
  return {
    transaction: (fn) =>
      store.transaction((tx) =>
        fn(
          new Proxy(tx, {
            get(target, prop, receiver) {
              if (prop === method) {
                return () => {
                  throw new Error(`injected failure in ${String(prop)}`);
                };
              }
              return Reflect.get(target, prop, receiver);
            },
          }),
        ),
      ),
  };
}

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as DomainError).code;
  }
}

async function counts() {
  const [row] = await testSql()`
    SELECT
      (SELECT count(*)::int FROM topics) AS topics,
      (SELECT count(*)::int FROM posts) AS posts,
      (SELECT count(*)::int FROM topic_views) AS views
  `;
  return row as { topics: number; posts: number; views: number };
}

async function topicRow(topicId: string) {
  const [row] = await testSql()`
    SELECT reply_count, last_activity_at, view_count, created_at
    FROM topics WHERE id = ${topicId}
  `;
  return row;
}

beforeEach(async () => {
  await truncateAll();
  authorId = await insertUser("author");
  boardId = await insertBoard("General");
});

afterAll(async () => {
  await closeTestSql();
});

describe("createTopic", () => {
  it("commits topic and opening post together with one timestamp", async () => {
    const { topicId, slug } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Hello World!",
      content: "First post",
    });
    expect(slug).toBe("hello-world");

    const [post] = await testSql()`
      SELECT kind, content, created_at FROM posts WHERE topic_id = ${topicId}
    `;
    expect(post.kind).toBe("opening");

    const topic = await topicRow(topicId);
    expect(topic.reply_count).toBe(0);
    expect(new Date(topic.last_activity_at).getTime()).toBe(
      new Date(post.created_at).getTime(),
    );
  });

  it("rolls back the topic when the opening post insert fails", async () => {
    const failing = createTopicDiscussion(storeFailingAt("insertOpeningPost"));
    await expect(
      failing.createTopic({
        actorId: authorId,
        boardId,
        title: "Doomed",
        content: "never persists",
      }),
    ).rejects.toThrow(/injected failure/);
    expect(await counts()).toEqual({ topics: 0, posts: 0, views: 0 });
  });

  it("rejects empty titles/content and missing boards with typed errors", async () => {
    const base = { actorId: authorId, boardId };
    expect(
      await code(discussion.createTopic({ ...base, title: " ", content: "x" })),
    ).toBe("INVALID_TOPIC_TITLE");
    expect(
      await code(
        discussion.createTopic({ ...base, title: "abc", content: "  " }),
      ),
    ).toBe("INVALID_POST_CONTENT");
    expect(
      await code(
        discussion.createTopic({
          actorId: authorId,
          boardId: "6f6dcbcf-2f3e-4c39-9a4a-999999999999",
          title: "abc",
          content: "x",
        }),
      ),
    ).toBe("BOARD_NOT_FOUND");
  });

  it("returns the typed conflict on a global case-insensitive slug collision", async () => {
    await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Hello World",
      content: "x",
    });
    const other = await insertBoard("Other");
    expect(
      await code(
        discussion.createTopic({
          actorId: authorId,
          boardId: other,
          title: "HELLO, world?!",
          content: "y",
        }),
      ),
    ).toBe("TOPIC_SLUG_CONFLICT");
  });

  it("the database permits exactly one opening post per topic", async () => {
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Guarded",
      content: "x",
    });
    await expect(
      testSql()`
        INSERT INTO posts (topic_id, author_id, content, kind)
        VALUES (${topicId}, ${authorId}, 'second opening', 'opening')
      `,
    ).rejects.toThrow(/posts_topic_opening_unique_idx|duplicate key/);
  });
});

describe("replyToTopic", () => {
  let topicId: string;

  beforeEach(async () => {
    ({ topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Discussion",
      content: "opening",
    }));
  });

  it("updates replyCount and lastActivityAt atomically with the insert", async () => {
    const { postId } = await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "first reply",
    });
    const [post] = await testSql()`
      SELECT created_at FROM posts WHERE id = ${postId}
    `;
    const topic = await topicRow(topicId);
    expect(topic.reply_count).toBe(1);
    expect(new Date(topic.last_activity_at).getTime()).toBe(
      new Date(post.created_at).getTime(),
    );
  });

  it("keeps the counter exact under parallel replies", async () => {
    await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        discussion.replyToTopic({
          actorId: authorId,
          topicId,
          content: `parallel ${i}`,
        }),
      ),
    );
    expect((await topicRow(topicId)).reply_count).toBe(4);
  });

  it("rolls back the reply when the counter update fails", async () => {
    const failing = createTopicDiscussion(storeFailingAt("bumpTopicActivity"));
    await expect(
      failing.replyToTopic({ actorId: authorId, topicId, content: "doomed" }),
    ).rejects.toThrow(/injected failure/);
    const { posts: postCount } = await counts();
    expect(postCount).toBe(1); // only the opening post
    expect((await topicRow(topicId)).reply_count).toBe(0);
  });

  it("rejects replies to a locked topic while holding the row lock", async () => {
    // Simulate a concurrent moderator: an open transaction holds the topic
    // row lock and locks the topic. The module's reply MUST block on the
    // row lock and then observe isLocked=true — never insert first.
    const target = dbTargetFromEnv(process.env);
    const locker = postgres({
      host: target.host,
      port: target.port,
      database: target.database,
      username: target.user,
      password: target.password,
      max: 1,
      onnotice: () => {},
    });
    try {
      let raced: Promise<unknown> = Promise.resolve();
      await locker.begin(async (tx) => {
        await tx`SELECT id FROM topics WHERE id = ${topicId} FOR UPDATE`;
        await tx`UPDATE topics SET is_locked = true WHERE id = ${topicId}`;
        // Start the module reply now: it must BLOCK on the row lock (never
        // insert first). Do not await it here — the transaction commits
        // after briefly holding the lock, and only then can it proceed.
        raced = discussion
          .replyToTopic({ actorId: authorId, topicId, content: "raced reply" })
          .catch((error) => error);
        await new Promise((resolve) => setTimeout(resolve, 300));
      });

      const outcome = await raced;
      expect((outcome as DomainError).code).toBe("TOPIC_LOCKED");
      const [{ count }] = await testSql()`
        SELECT count(*)::int AS count FROM posts
        WHERE topic_id = ${topicId} AND content = 'raced reply'
      `;
      expect(count).toBe(0);
    } finally {
      await locker.end();
    }
  });

  it("copies the quote snapshot from the source post inside the transaction", async () => {
    // Read through drizzle so timestamp semantics match the module exactly
    // (postgres.js parses naive timestamps as local time, drizzle as UTC).
    const [opening] = await testDrizzle().query.posts.findMany({
      where: (p, { eq: whereEq }) => whereEq(p.topicId, topicId),
    });
    const { postId } = await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "quoting you",
      quotedPostId: opening.id,
    });
    const [reply] = await testSql()`
      SELECT quote_snapshot FROM posts WHERE id = ${postId}
    `;
    expect(reply.quote_snapshot).toEqual({
      version: 1,
      sourcePostId: opening.id,
      authorName: "author",
      content: opening.content,
      createdAt: opening.createdAt.toISOString(),
    });
  });

  it("refuses to quote deleted posts and posts from other topics", async () => {
    const { postId: replyId } = await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "to be deleted",
    });
    await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId: replyId,
    });
    expect(
      await code(
        discussion.replyToTopic({
          actorId: authorId,
          topicId,
          content: "quote attempt",
          quotedPostId: replyId,
        }),
      ),
    ).toBe("QUOTED_POST_DELETED");

    const { topicId: otherTopic } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Unrelated",
      content: "x",
    });
    const [foreignPost] = await testSql()`
      SELECT id FROM posts WHERE topic_id = ${otherTopic}
    `;
    expect(
      await code(
        discussion.replyToTopic({
          actorId: authorId,
          topicId,
          content: "cross-topic quote",
          quotedPostId: foreignPost.id as string,
        }),
      ),
    ).toBe("POST_NOT_FOUND");
  });
});

describe("editPost and deleteReply", () => {
  let topicId: string;
  let replyId: string;

  beforeEach(async () => {
    ({ topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Editable",
      content: "opening",
    }));
    ({ postId: replyId } = await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "reply",
    }));
  });

  it("opening posts cannot be deleted", async () => {
    const [opening] = await testSql()`
      SELECT id FROM posts WHERE topic_id = ${topicId} AND kind = 'opening'
    `;
    expect(
      await code(
        discussion.deleteReply({
          actor: { id: authorId, role: "admin" },
          postId: opening.id as string,
        }),
      ),
    ).toBe("OPENING_POST_UNDELETABLE");
  });

  it("delete decrements once, is idempotent, and recomputes last activity", async () => {
    const { postId: secondReply } = await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "newest",
    });
    const [firstReplyRow] = await testSql()`
      SELECT created_at FROM posts WHERE id = ${replyId}
    `;

    const first = await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId: secondReply,
    });
    expect(first.alreadyDeleted).toBe(false);

    let topic = await topicRow(topicId);
    expect(topic.reply_count).toBe(1);
    // Activity falls back to the newest remaining ACTIVE reply.
    expect(new Date(topic.last_activity_at).getTime()).toBe(
      new Date(firstReplyRow.created_at).getTime(),
    );

    const again = await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId: secondReply,
    });
    expect(again.alreadyDeleted).toBe(true);
    topic = await topicRow(topicId);
    expect(topic.reply_count).toBe(1); // not decremented twice

    // Deleting the last reply falls back to the opening-post time.
    await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId: replyId,
    });
    topic = await topicRow(topicId);
    expect(topic.reply_count).toBe(0);
    expect(new Date(topic.last_activity_at).getTime()).toBe(
      new Date(topic.created_at).getTime(),
    );
  });

  it("keeps soft-deleted rows intact when activity recompute fails", async () => {
    const failing = createTopicDiscussion(storeFailingAt("setLastActivity"));
    await expect(
      failing.deleteReply({
        actor: { id: authorId, role: "user" },
        postId: replyId,
      }),
    ).rejects.toThrow(/injected failure/);
    const [post] = await testSql()`
      SELECT is_deleted FROM posts WHERE id = ${replyId}
    `;
    expect(post.is_deleted).toBe(false);
    expect((await topicRow(topicId)).reply_count).toBe(1);
  });

  it("deleted posts cannot be edited; non-authors are rejected", async () => {
    const stranger = await insertUser("stranger");
    expect(
      await code(
        discussion.editPost({
          actor: { id: stranger, role: "user" },
          postId: replyId,
          content: "hijack",
        }),
      ),
    ).toBe("NOT_POST_AUTHOR");

    await discussion.deleteReply({
      actor: { id: authorId, role: "user" },
      postId: replyId,
    });
    expect(
      await code(
        discussion.editPost({
          actor: { id: authorId, role: "user" },
          postId: replyId,
          content: "too late",
        }),
      ),
    ).toBe("POST_DELETED");
  });
});

describe("recordTopicView", () => {
  it("counts once per topic/session pair; new sessions count again", async () => {
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Viewed",
      content: "x",
    });
    const sessionA = "11111111-1111-4111-8111-111111111111";
    const sessionB = "22222222-2222-4222-8222-222222222222";

    expect(
      await discussion.recordTopicView({ topicId, browserSessionId: sessionA }),
    ).toEqual({ counted: true });
    expect(
      await discussion.recordTopicView({ topicId, browserSessionId: sessionA }),
    ).toEqual({ counted: false });
    expect(
      await discussion.recordTopicView({ topicId, browserSessionId: sessionB }),
    ).toEqual({ counted: true });

    expect((await topicRow(topicId)).view_count).toBe(2);
  });

  it("rolls back the dedup row when the counter increment fails", async () => {
    const { topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Unviewed",
      content: "x",
    });
    const failing = createTopicDiscussion(storeFailingAt("incrementViewCount"));
    await expect(
      failing.recordTopicView({
        topicId,
        browserSessionId: "33333333-3333-4333-8333-333333333333",
      }),
    ).rejects.toThrow(/injected failure/);
    expect((await counts()).views).toBe(0);
    expect((await topicRow(topicId)).view_count).toBe(0);
  });
});
