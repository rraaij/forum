import type { Hono } from "hono";
import { getDb } from "../db";
import { createForumReadModel } from "../modules/forum-read/queries";
import { createForumReadStore } from "../modules/forum-read/repository";
import { createTopicDiscussion } from "../modules/topic-discussion/commands";
import { createDrizzleTopicDiscussionStore } from "../modules/topic-discussion/repository";
import type { AppEnv } from "../types";
import { adminRoutes } from "./admin";
import { authRoutes } from "./auth";
import { categoriesRoutes } from "./categories";
import { profileRoutes } from "./profile";
import { reactionsRoutes } from "./reactions";
import { createForumReadRoutes } from "./replacement/forum-read";
import {
  createReplacementPostRoutes,
  createReplacementTopicRoutes,
} from "./replacement/topic-discussion";
import { votesRoutes } from "./votes";

/*
 * Routes are CHAINED and the result returned so the accumulated Hono schema
 * reaches the exported AppType — hc<AppType> on the frontend derives its
 * transport types from it (refactor plan section 6.2).
 *
 * Phase 4 state: forum reads and topic/post writes are the REPLACEMENT
 * adapters backed by domain modules. Old and new handlers for the same
 * method/path are never registered simultaneously. Still legacy until their
 * phases: admin + categories reads (Phase 5, CategoryManagerDialog still
 * calls GET /api/categories), reactions/votes (Phase 5), profile (6/7).
 */
export function mountRoutes(app: Hono<AppEnv>) {
  const db = getDb();
  const topicDiscussion = createTopicDiscussion(
    createDrizzleTopicDiscussionStore(db),
  );
  const forumRead = createForumReadModel(createForumReadStore(db));

  return app
    .route("/api/auth", authRoutes)
    .route("/api/admin", adminRoutes)
    .route("/api/categories", categoriesRoutes)
    .route("/api/forum", createForumReadRoutes(forumRead))
    .route("/api/topics", createReplacementTopicRoutes(topicDiscussion))
    .route("/api/posts", createReplacementPostRoutes(topicDiscussion))
    .route("/api/profile", profileRoutes)
    .route("/api/reactions", reactionsRoutes)
    .route("/api/votes", votesRoutes);
}
