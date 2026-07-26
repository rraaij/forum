/*
 * Mounted contract test for GET /api/profile/activity (plan Phase 7): the
 * route is scoped to the session actor and serves the module's read model
 * through the real app composition.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../../src/modules/topic-discussion/repository";
import { signUpUser } from "../helpers/auth";
import { closeTestSql, testDrizzle, truncateAll } from "../helpers/db";
import { insertBoard } from "../helpers/fixtures";

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

describe("GET /api/profile/activity", () => {
  it("returns the signed-in author's activity with canonical route params", async () => {
    const user = await signUpUser(app, "activity-http");
    const other = await signUpUser(app, "activity-http-other");
    const root = await insertBoard("General");
    const nested = await insertBoard("Nested", root);

    const { topicId } = await discussion.createTopic({
      actorId: user.id,
      boardId: nested,
      title: "Nested topic",
      content: "opening",
    });
    await discussion.replyToTopic({
      actorId: other.id,
      topicId,
      content: "someone else",
    });

    const res = await app.request("/api/profile/activity", {
      headers: { Cookie: user.cookie },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      postKind: "opening",
      isDeleted: false,
      topicTitle: "Nested topic",
      routeParams: {
        kind: "boardTopic",
        categorySlug: "general",
        boardId: nested,
      },
    });
    expect(body[0].breadcrumbs.map((crumb: { slug: string }) => crumb.slug)) //
      .toEqual(["general", "nested"]);
  });
});
