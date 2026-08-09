/*
 * Mounted contract tests for the /api/forum read adapters (plan Phase 4):
 * response shapes, envelope errors, and query validation through the real
 * app composition.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../../src/modules/topic-discussion/repository";
import { signUpUser } from "../helpers/auth";
import { closeTestSql, testDrizzle, testSql, truncateAll } from "../helpers/db";
import { insertBoard, insertUser } from "../helpers/fixtures";

const app = createApp();
const discussion = createTopicDiscussion(
  createDrizzleTopicDiscussionStore(testDrizzle()),
);

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestSql();
});

describe("GET /api/forum", () => {
  it("returns the nested index", async () => {
    const root = await insertBoard("General");
    const nested = await insertBoard("Nested", root);
    const authorId = await insertUser("index-reader");
    const topic = await discussion.createTopic({
      actorId: authorId,
      boardId: nested,
      title: "Nested activity",
      content: "opening",
    });
    await discussion.replyToTopic({
      actorId: authorId,
      topicId: topic.topicId,
      content: "reply",
    });
    const res = await app.request("/api/forum");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].children[0].name).toBe("Nested");
    expect(body.categories[0].latestActivity).toMatchObject({
      topicId: topic.topicId,
      replyCount: 1,
      author: {
        id: authorId,
        name: "index-reader",
        displayName: null,
        image: null,
      },
      routeParams: {
        kind: "boardTopic",
        categorySlug: "general",
        boardId: nested,
        topicSlug: topic.slug,
      },
    });
  });

  it("only exposes guest-hidden content to authenticated viewers", async () => {
    const member = await signUpUser(app, "hidden-reader");
    const boardId = await insertBoard("Members");
    await testSql()`
      UPDATE boards SET is_guest_visible = false WHERE id = ${boardId}
    `;
    const topic = await discussion.createTopic({
      actorId: member.id,
      boardId,
      title: "Private discussion",
      content: "opening",
    });

    const anonymousIndex = await app.request("/api/forum");
    expect((await anonymousIndex.json()).categories).toEqual([]);
    const memberIndex = await app.request("/api/forum", {
      headers: { Cookie: member.cookie },
    });
    expect((await memberIndex.json()).categories[0].id).toBe(boardId);

    const anonymousCategory = await app.request(
      "/api/forum/categories/members",
    );
    expect(anonymousCategory.status).toBe(404);
    const memberCategory = await app.request("/api/forum/categories/members", {
      headers: { Cookie: member.cookie },
    });
    expect(memberCategory.status).toBe(200);

    const anonymousTopic = await app.request(`/api/forum/topics/${topic.slug}`);
    expect(anonymousTopic.status).toBe(404);
    const memberTopic = await app.request(`/api/forum/topics/${topic.slug}`, {
      headers: { Cookie: member.cookie },
    });
    expect(memberTopic.status).toBe(200);
  });
});

describe("GET /api/forum/categories/:categorySlug", () => {
  it("returns pages and envelope errors", async () => {
    await insertBoard("General");
    const ok = await app.request("/api/forum/categories/GENERAL");
    expect(ok.status).toBe(200);
    expect((await ok.json()).category.slug).toBe("general");

    const missing = await app.request("/api/forum/categories/nope");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("CATEGORY_NOT_FOUND");

    const badCursor = await app.request(
      "/api/forum/categories/general?topicCursor=%20bad%20",
    );
    expect(badCursor.status).toBe(400);
    expect((await badCursor.json()).error.code).toBe("INVALID_INPUT");

    const badLimit = await app.request(
      "/api/forum/categories/general?topicLimit=101",
    );
    expect(badLimit.status).toBe(400);
  });
});

describe("GET /api/forum/topics/:topicSlug", () => {
  it("returns the full topic page read model", async () => {
    const boardId = await insertBoard("General");
    const authorId = await insertUser("reader");
    const { slug, topicId } = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Mounted topic",
      content: "opening",
    });
    await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "reply",
    });
    const targeted = await discussion.replyToTopic({
      actorId: authorId,
      topicId,
      content: "targeted reply",
    });

    const res = await app.request(`/api/forum/topics/${slug}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.openingPost.kind).toBe("opening");
    expect(body.openingPost.author).toMatchObject({
      postCount: 3,
      role: "user",
      tagline: null,
    });
    expect(body.openingPost.author.memberSince).toEqual(expect.any(String));
    expect(body.replies.items).toHaveLength(2);
    expect(body.routeParams).toEqual({
      kind: "rootTopic",
      categorySlug: "general",
      topicSlug: slug,
    });

    const targetRes = await app.request(
      `/api/forum/topics/${slug}?targetReplyId=${targeted.postId}`,
    );
    expect(targetRes.status).toBe(200);
    const targetBody = await targetRes.json();
    expect(targetBody.replyStartIndex).toBe(1);
    expect(targetBody.replies.items[0].id).toBe(targeted.postId);

    const missing = await app.request("/api/forum/topics/none");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("TOPIC_NOT_FOUND");
  });
});
