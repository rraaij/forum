/*
 * Topic discussion commands (refactor plan section 5.1).
 *
 * Rules implemented here, not in adapters:
 * - title/content bounds are re-validated at the module seam
 * - one timestamp per command for all related records
 * - topic + opening post commit together; reply + counters commit together
 * - the topic row is locked BEFORE the isLocked check and reply insert
 * - quote snapshots are built from the source row inside the reply
 *   transaction; client-supplied snapshot fields never exist in the input
 * - authorization lives here; adapters only supply the authenticated actor
 */

import { buildBoardHierarchy } from "../shared/board-hierarchy";
import { validationError } from "../shared/errors";
import type { QuoteSnapshotV1 } from "../shared/quote-snapshot";
import {
  boardNotFound,
  deletedPostImmutable,
  deletedPostUnquotable,
  notPostAuthor,
  openingPostUndeletable,
  postNotFound,
  topicLocked,
  topicNotFound,
  topicSlugConflict,
} from "./errors";
import type { TopicDiscussionStore, TopicDiscussionTx } from "./repository";
import type { TopicDiscussion } from "./types";
import {
  generateTopicSlug,
  normalizePostContent,
  normalizeTopicTitle,
} from "./validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Modules repeat transport invariants because non-HTTP callers can invoke
// them directly (plan section 6.1). Better Auth actor IDs stay free-text.
function assertUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw validationError("INVALID_ID", `${field} must be a valid ID`, field);
  }
}

async function buildQuoteSnapshot(
  tx: TopicDiscussionTx,
  quotedPostId: string,
  topicId: string,
): Promise<QuoteSnapshotV1> {
  const source = await tx.findQuotablePost(quotedPostId);
  // A quoted post must exist in the topic being replied to.
  if (!source || source.topicId !== topicId) throw postNotFound();
  if (source.isDeleted) throw deletedPostUnquotable();
  return {
    version: 1,
    sourcePostId: source.id,
    authorName: source.authorName ?? "unknown",
    content: source.content,
    createdAt: source.createdAt.toISOString(),
  };
}

export function createTopicDiscussion(
  store: TopicDiscussionStore,
): TopicDiscussion {
  return {
    async createTopic(input) {
      assertUuid(input.boardId, "boardId");
      const title = normalizeTopicTitle(input.title);
      const content = normalizePostContent(input.content);
      const slug = generateTopicSlug(title);
      const now = new Date();

      return store.transaction(async (tx) => {
        const hierarchy = buildBoardHierarchy(
          await tx.boardAncestry(input.boardId),
        );
        const routeParams = hierarchy.topicRouteParams(input.boardId, slug);
        if (!routeParams) throw boardNotFound();
        if (await tx.topicSlugTaken(slug)) throw topicSlugConflict(slug);

        const topicId = await tx.insertTopic({
          boardId: input.boardId,
          authorId: input.actorId,
          title,
          slug,
          now,
        });
        await tx.insertOpeningPost({
          topicId,
          authorId: input.actorId,
          content,
          now,
        });

        return { topicId, slug, routeParams };
      });
    },

    async replyToTopic(input) {
      assertUuid(input.topicId, "topicId");
      if (input.quotedPostId !== undefined) {
        assertUuid(input.quotedPostId, "quotedPostId");
      }
      const content = normalizePostContent(input.content);
      const now = new Date();

      return store.transaction(async (tx) => {
        // Row lock first: a concurrent lock/unlock or delete cannot race
        // past the isLocked check below.
        const topic = await tx.lockTopic(input.topicId);
        if (!topic) throw topicNotFound();
        if (topic.isLocked) throw topicLocked();

        const quoteSnapshot = input.quotedPostId
          ? await buildQuoteSnapshot(tx, input.quotedPostId, topic.id)
          : null;

        const postId = await tx.insertReply({
          topicId: topic.id,
          authorId: input.actorId,
          content,
          quoteSnapshot,
          now,
        });
        await tx.bumpTopicActivity(topic.id, now);

        return { postId };
      });
    },

    async editPost(input) {
      assertUuid(input.postId, "postId");
      const content = normalizePostContent(input.content);
      const now = new Date();

      await store.transaction(async (tx) => {
        const post = await tx.findPost(input.postId);
        if (!post) throw postNotFound();
        if (post.isDeleted) throw deletedPostImmutable();
        // Editing stays author-only (characterized legacy behavior); the
        // actor's role is accepted for future moderator rules.
        if (post.authorId !== input.actor.id) throw notPostAuthor();

        await tx.updatePostContent(post.id, content, now);
      });
    },

    async deleteReply(input) {
      assertUuid(input.postId, "postId");
      const now = new Date();

      return store.transaction(async (tx) => {
        const post = await tx.findPost(input.postId);
        if (!post) throw postNotFound();
        if (post.kind === "opening") throw openingPostUndeletable();
        if (post.authorId !== input.actor.id && input.actor.role !== "admin") {
          throw notPostAuthor();
        }

        // Idempotent: repeating a delete never decrements again.
        if (post.isDeleted) return { alreadyDeleted: true };

        // Serialize counter and activity math per topic.
        const topic = await tx.lockTopic(post.topicId);
        if (!topic) throw topicNotFound();

        // The conditional update is the authoritative idempotency decision.
        // A concurrent request may have read the same active row before this
        // transaction acquired the Topic lock, but only one can transition it.
        const deleted = await tx.softDeletePost(post.id, now);
        if (!deleted) return { alreadyDeleted: true };
        await tx.decrementReplyCount(topic.id);

        // Last activity falls back to the newest ACTIVE reply, or the
        // opening post time (equal to the topic's createdAt).
        const latestReplyAt = await tx.latestActiveReplyAt(topic.id);
        await tx.setLastActivity(topic.id, latestReplyAt ?? topic.createdAt);

        return { alreadyDeleted: false };
      });
    },

    async recordTopicView(input) {
      assertUuid(input.topicId, "topicId");
      assertUuid(input.browserSessionId, "browserSessionId");
      const now = new Date();

      return store.transaction(async (tx) => {
        if (!(await tx.topicExists(input.topicId))) throw topicNotFound();

        const counted = await tx.recordView(
          input.topicId,
          input.browserSessionId,
          now,
        );
        // view_count only moves when this (topic, session) pair is new.
        if (counted) await tx.incrementViewCount(input.topicId);

        return { counted };
      });
    },
  };
}
