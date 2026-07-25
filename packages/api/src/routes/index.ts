import type { Hono } from "hono";
import { getDb } from "../db";
import { createBoardManagement } from "../modules/board-management/commands";
import { createDrizzleBoardManagementStore } from "../modules/board-management/repository";
import { createForumReadModel } from "../modules/forum-read/queries";
import { createForumReadStore } from "../modules/forum-read/repository";
import { createInteractionWrite } from "../modules/interaction-write/commands";
import { createDrizzleInteractionWriteStore } from "../modules/interaction-write/repository";
import { createTopicDiscussion } from "../modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../modules/topic-discussion/repository";
import type { AppEnv } from "../types";
import { authRoutes } from "./auth";
import { profileRoutes } from "./profile";
import { createReactionRoutes } from "./reactions";
import { createAdminBoardRoutes } from "./replacement/board-management";
import { createForumReadRoutes } from "./replacement/forum-read";
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
 * Phase 5 state: forum reads, topic/post writes, board administration, and
 * reaction/vote writes are all backed by domain modules. Only /api/profile
 * remains a legacy adapter (Phases 6 and 7).
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

  return app
    .route("/api/auth", authRoutes)
    .route("/api/admin/boards", createAdminBoardRoutes(boardManagement))
    .route("/api/forum", createForumReadRoutes(forumRead))
    .route("/api/topics", createReplacementTopicRoutes(topicDiscussion))
    .route("/api/posts", createReplacementPostRoutes(topicDiscussion))
    .route("/api/profile", profileRoutes)
    .route("/api/reactions", createReactionRoutes(interactions))
    .route("/api/votes", createVoteRoutes(interactions));
}
