import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTopicDiscussion } from "../../src/modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../../src/modules/topic-discussion/repository";
import { createTopicNotifications } from "../../src/modules/topic-notifications/queries";
import { createTopicNotificationStore } from "../../src/modules/topic-notifications/repository";
import { closeTestSql, testDrizzle, testSql, truncateAll } from "../helpers/db";
import { insertBoard, insertUser } from "../helpers/fixtures";

const discussion = createTopicDiscussion(
  createDrizzleTopicDiscussionStore(testDrizzle()),
);
const notifications = createTopicNotifications(
  createTopicNotificationStore(testDrizzle()),
);

let topicId: string;
let topicSlug: string;
let creatorId: string;
let replierId: string;

beforeEach(async () => {
  await truncateAll();
  const boardId = await insertBoard("General");
  creatorId = await insertUser("creator");
  replierId = await insertUser("replier");
  const created = await discussion.createTopic({
    actorId: creatorId,
    boardId,
    title: "Notification contract",
    content: "opening",
  });
  topicId = created.topicId;
  topicSlug = created.slug;
});

afterAll(closeTestSql);

describe("topic notifications", () => {
  it("auto-subscribes the creator and keeps manual changes idempotent", async () => {
    await expect(
      notifications.getSubscription(creatorId, topicId),
    ).resolves.toEqual({ subscribed: true });
    await expect(
      notifications.setSubscription(replierId, topicId, true),
    ).resolves.toEqual({ subscribed: true });
    await expect(
      notifications.setSubscription(replierId, topicId, true),
    ).resolves.toEqual({ subscribed: true });

    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count
      FROM topic_subscriptions
      WHERE user_id = ${replierId} AND topic_id = ${topicId}
    `;
    expect(count).toBe(1);

    await notifications.setSubscription(replierId, topicId, false);
    await expect(
      notifications.getSubscription(replierId, topicId),
    ).resolves.toEqual({ subscribed: false });
  });

  it("fans out once, suppresses self replies, and isolates recipient state", async () => {
    const { postId } = await discussion.replyToTopic({
      actorId: replierId,
      topicId,
      content: "creator should see this",
    });
    await discussion.replyToTopic({
      actorId: creatorId,
      topicId,
      content: "creator should not notify themselves",
    });

    await expect(notifications.unreadCount(creatorId)).resolves.toEqual({
      count: 1,
    });
    await expect(notifications.unreadCount(replierId)).resolves.toEqual({
      count: 0,
    });

    const page = await notifications.listForUser(creatorId, {});
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      postId,
      routeParams: {
        kind: "rootTopic",
        categorySlug: "general",
        topicSlug,
      },
      actor: { id: replierId },
    });

    const notificationId = page.items[0]?.id ?? "";
    await expect(
      notifications.markRead(replierId, notificationId),
    ).rejects.toMatchObject({ code: "NOTIFICATION_NOT_FOUND" });
    await notifications.markRead(creatorId, notificationId);
    await notifications.markRead(creatorId, notificationId);
    await expect(notifications.unreadCount(creatorId)).resolves.toEqual({
      count: 0,
    });
  });
});
