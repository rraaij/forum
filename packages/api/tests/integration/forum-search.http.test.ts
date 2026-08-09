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

beforeEach(truncateAll);
afterAll(closeTestSql);

describe("GET /api/search", () => {
  it("returns mounted search results and parses explicit booleans", async () => {
    const authorId = await insertUser("http-searcher");
    const boardId = await insertBoard("General");
    await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Search transport",
      content: "only content needle",
    });

    const content = await app.request("/api/search?q=needle&topicsOnly=false");
    expect(content.status).toBe(200);
    expect((await content.json()).totalCount).toBe(1);
    const titles = await app.request("/api/search?q=needle&topicsOnly=true");
    expect(titles.status).toBe(200);
    expect((await titles.json()).totalCount).toBe(0);
  });

  it("uses the standard validation envelope", async () => {
    const invalid = await app.request("/api/search?q=x&topicsOnly=maybe");
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("INVALID_INPUT");
  });
});
