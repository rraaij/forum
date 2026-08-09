import type { Hono } from "hono";
import { getDb } from "../db";
import { createBoardManagement } from "../modules/board-management/commands";
import { createDrizzleBoardManagementStore } from "../modules/board-management/repository";
import { createForumReadModel } from "../modules/forum-read/queries";
import { createForumReadStore } from "../modules/forum-read/repository";
import { createForumSearch } from "../modules/forum-search/queries";
import { createForumSearchStore } from "../modules/forum-search/repository";
import { createInteractionWrite } from "../modules/interaction-write/commands";
import { createDrizzleInteractionWriteStore } from "../modules/interaction-write/repository";
import { createProfileActivity } from "../modules/profile-activity/queries";
import { createProfileActivityStore } from "../modules/profile-activity/repository";
import { createProfileEdit } from "../modules/profile-edit/commands";
import { createDrizzleProfileEditStore } from "../modules/profile-edit/repository";
import { createTopicDiscussion } from "../modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../modules/topic-discussion/repository";
import { createTopicNotifications } from "../modules/topic-notifications/queries";
import { createTopicNotificationStore } from "../modules/topic-notifications/repository";
import type { AppEnv } from "../types";
import { authRoutes } from "./auth";
import { createAdminBoardRoutes } from "./board-management";
import { createForumReadRoutes } from "./forum-read";
import { createForumSearchRoutes } from "./forum-search";
import { createProfileActivityRoutes } from "./profile-activity";
import { createProfileEditRoutes } from "./profile-edit";
import { createReactionRoutes } from "./reactions";
import { createPostRoutes, createTopicRoutes } from "./topic-discussion";
import {
  createNotificationRoutes,
  createTopicSubscriptionRoutes,
} from "./topic-notifications";
import { createVoteRoutes } from "./votes";

/*
 * Routes are CHAINED and the result returned so the accumulated Hono schema
 * reaches the exported AppType — hc<AppType> on the frontend derives its
 * transport types from it (refactor plan section 6.2).
 *
 * Every route is backed by a domain module. Each file here is a pure
 * adapter: runtime validation, actor extraction, module invocation, HTTP
 * mapping — and nothing else.
 */
export function mountRoutes(app: Hono<AppEnv>) {
  const db = getDb();
  const topicDiscussion = createTopicDiscussion(
    createDrizzleTopicDiscussionStore(db),
  );
  const forumRead = createForumReadModel(createForumReadStore(db));
  const forumSearch = createForumSearch(createForumSearchStore(db));
  const boardManagement = createBoardManagement(
    createDrizzleBoardManagementStore(db),
  );
  const interactions = createInteractionWrite(
    createDrizzleInteractionWriteStore(db),
  );
  const profiles = createProfileEdit(createDrizzleProfileEditStore(db));
  const activity = createProfileActivity(createProfileActivityStore(db));
  const topicNotifications = createTopicNotifications(
    createTopicNotificationStore(db),
  );

  return (
    app
      .route("/api/auth", authRoutes)
      .route("/api/admin/boards", createAdminBoardRoutes(boardManagement))
      .route("/api/forum", createForumReadRoutes(forumRead))
      .route("/api/search", createForumSearchRoutes(forumSearch))
      .route("/api/topics", createTopicRoutes(topicDiscussion))
      .route("/api/topics", createTopicSubscriptionRoutes(topicNotifications))
      .route("/api/posts", createPostRoutes(topicDiscussion))
      .route("/api/notifications", createNotificationRoutes(topicNotifications))
      // Editing and activity are separate modules sharing one path prefix;
      // they never register the same method and path.
      .route("/api/profile", createProfileEditRoutes(profiles))
      .route("/api/profile", createProfileActivityRoutes(activity))
      .route("/api/reactions", createReactionRoutes(interactions))
      .route("/api/votes", createVoteRoutes(interactions))
  );
}
