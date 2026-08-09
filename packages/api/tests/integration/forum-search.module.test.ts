import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createForumSearch } from "../../src/modules/forum-search/queries";
import { createForumSearchStore } from "../../src/modules/forum-search/repository";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../../src/modules/topic-discussion/repository";
import { closeTestSql, testDrizzle, testSql, truncateAll } from "../helpers/db";
import { insertBoard, insertUser } from "../helpers/fixtures";

const search = createForumSearch(createForumSearchStore(testDrizzle()));
const discussion = createTopicDiscussion(
  createDrizzleTopicDiscussionStore(testDrizzle()),
);

let authorId: string;
let boardId: string;

beforeEach(async () => {
  await truncateAll();
  authorId = await insertUser("search-author");
  boardId = await insertBoard("General");
});

afterAll(closeTestSql);

describe("forum search", () => {
  it("deduplicates title and post matches into canonical topic results", async () => {
    const topic = await discussion.createTopic({
      actorId: authorId,
      boardId,
      title: "Keyset pagination explained",
      content: "Keyset pagination keeps large result sets stable.",
    });
    await discussion.replyToTopic({
      actorId: authorId,
      topicId: topic.topicId,
      content: "Another keyset pagination example",
    });

    const page = await search.search({ q: "keyset pagination" });
    expect(page.totalCount).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      topicId: topic.topicId,
      title: "Keyset pagination explained",
      routeParams: {
        kind: "rootTopic",
        categorySlug: "general",
        topicSlug: topic.slug,
      },
    });
    expect(page.items[0]?.titleSegments.some((part) => part.highlighted)).toBe(
      true,
    );
  });

  it("applies content, topic-only, subtree, and cursor filters", async () => {
    const childId = await insertBoard("Nested", boardId);
    const siblingId = await insertBoard("Other");
    for (const [index, targetBoard] of [
      childId,
      childId,
      siblingId,
    ].entries()) {
      const created = await discussion.createTopic({
        actorId: authorId,
        boardId: targetBoard,
        title: `Result ${index}`,
        content: `needle content ${index}`,
      });
      await testSql()`
        UPDATE topics SET created_at = ${new Date(`2026-01-0${index + 1}T12:00:00Z`)}
        WHERE id = ${created.topicId}
      `;
      await testSql()`
        UPDATE posts SET created_at = ${new Date(`2026-01-0${index + 1}T12:00:00Z`)}
        WHERE topic_id = ${created.topicId}
      `;
    }

    const first = await search.search({
      q: "needle",
      boardId,
      limit: 1,
    });
    expect(first.totalCount).toBe(2);
    expect(first.nextCursor).toBeTruthy();
    const second = await search.search({
      q: "needle",
      boardId,
      limit: 1,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.items).toHaveLength(1);
    expect(second.items[0]?.topicId).not.toBe(first.items[0]?.topicId);

    const topicsOnly = await search.search({
      q: "needle",
      boardId,
      topicsOnly: true,
    });
    expect(topicsOnly.totalCount).toBe(0);
  });

  it("excludes guest-hidden matches before counts and paging", async () => {
    const hiddenId = await insertBoard("Members", boardId);
    await testSql()`
      UPDATE boards SET is_guest_visible = false WHERE id = ${hiddenId}
    `;
    await discussion.createTopic({
      actorId: authorId,
      boardId: hiddenId,
      title: "Secret searchable topic",
      content: "secret searchable content",
    });

    const anonymous = await search.search({ q: "searchable" });
    expect(anonymous).toMatchObject({ totalCount: 0, items: [] });
    const member = await search.search({
      q: "searchable",
      viewer: { isAuthenticated: true },
    });
    expect(member.totalCount).toBe(1);
  });
});
