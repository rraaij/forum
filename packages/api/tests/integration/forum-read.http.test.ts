/*
 * Mounted contract tests for the /api/forum read adapters (plan Phase 4):
 * response shapes, envelope errors, and query validation through the real
 * app composition.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../../src/modules/topic-discussion/repository";
import { closeTestSql, testDrizzle, truncateAll } from "../helpers/db";
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
    await insertBoard("Nested", root);
    const res = await app.request("/api/forum");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].children[0].name).toBe("Nested");
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

    const res = await app.request(`/api/forum/topics/${slug}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.openingPost.kind).toBe("opening");
    expect(body.replies.items).toHaveLength(1);
    expect(body.routeParams).toEqual({
      kind: "rootTopic",
      categorySlug: "general",
      topicSlug: slug,
    });

    const missing = await app.request("/api/forum/topics/none");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("TOPIC_NOT_FOUND");
  });
});
