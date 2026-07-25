import type { Hono } from "hono";
import { getDb } from "../db";
import { createBoardManagement } from "../modules/board-management/commands";
import { createDrizzleBoardManagementStore } from "../modules/board-management/repository";
import { createForumReadModel } from "../modules/forum-read/queries";
import { createForumReadStore } from "../modules/forum-read/repository";
import { createInteractionWrite } from "../modules/interaction-write/commands";
import { createDrizzleInteractionWriteStore } from "../modules/interaction-write/repository";
import { createProfileActivity } from "../modules/profile-activity/queries";
import { createProfileActivityStore } from "../modules/profile-activity/repository";
import { createProfileEdit } from "../modules/profile-edit/commands";
import { createDrizzleProfileEditStore } from "../modules/profile-edit/repository";
import { createTopicDiscussion } from "../modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../modules/topic-discussion/repository";
import type { AppEnv } from "../types";
import { authRoutes } from "./auth";
import { createReactionRoutes } from "./reactions";
import { createAdminBoardRoutes } from "./replacement/board-management";
import { createForumReadRoutes } from "./replacement/forum-read";
import { createProfileActivityRoutes } from "./replacement/profile-activity";
import { createProfileEditRoutes } from "./replacement/profile-edit";
import {
  createReplacementPostRoutes,
  createReplacementTopicRoutes,
} from "./replacement/topic-discussion";
import { createVoteRoutes } from "./votes";

/*
 * Routes are CHAINED and the result returned so the accumulated Hono schema
 * reaches the exported AppType — hc<AppType> on the frontend derives its
 * transport types from it (refactor plan section 6.2).
 *
 * Phase 7 state: every route is backed by a domain module. Nothing here
 * reads the legacy categories/subcategories tables, which Phase 8 drops.
 */
export function mountRoutes(app: Hono<AppEnv>) {
  const db = getDb();
  const topicDiscussion = createTopicDiscussion(
    createDrizzleTopicDiscussionStore(db),
  );
  const forumRead = createForumReadModel(createForumReadStore(db));
  const boardManagement = createBoardManagement(
    createDrizzleBoardManagementStore(db),
  );
  const interactions = createInteractionWrite(
    createDrizzleInteractionWriteStore(db),
  );
  const profiles = createProfileEdit(createDrizzleProfileEditStore(db));
  const activity = createProfileActivity(createProfileActivityStore(db));

  return (
    app
      .route("/api/auth", authRoutes)
      .route("/api/admin/boards", createAdminBoardRoutes(boardManagement))
      .route("/api/forum", createForumReadRoutes(forumRead))
      .route("/api/topics", createReplacementTopicRoutes(topicDiscussion))
      .route("/api/posts", createReplacementPostRoutes(topicDiscussion))
      // Editing and activity are separate modules sharing one path prefix;
      // they never register the same method and path.
      .route("/api/profile", createProfileEditRoutes(profiles))
      .route("/api/profile", createProfileActivityRoutes(activity))
      .route("/api/reactions", createReactionRoutes(interactions))
      .route("/api/votes", createVoteRoutes(interactions))
  );
}
