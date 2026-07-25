/*
 * Data access for profile activity (refactor plan section 5.5). Two fixed
 * queries: the author's posts, and the boards needed to navigate ancestry.
 * The post's kind is READ, never inferred from its position in a window.
 */

import { boards, posts, topics } from "@forum/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Database } from "../../db";
import type { HierarchyBoardRow } from "../shared/board-hierarchy";

export interface ActivityPostRow {
  postId: string;
  /** Null only for rows predating the expansion migration. */
  kind: "opening" | "reply" | null;
  content: string;
  createdAt: Date;
  isDeleted: boolean;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  /** Null until Phase 8 makes the column NOT NULL. */
  boardId: string | null;
}

export interface ProfileActivityStore {
  postsByAuthor(userId: string): Promise<ActivityPostRow[]>;
  hierarchyBoards(): Promise<HierarchyBoardRow[]>;
}

export function createProfileActivityStore(db: Database): ProfileActivityStore {
  return {
    async postsByAuthor(userId) {
      return (
        db
          .select({
            postId: posts.id,
            kind: posts.kind,
            content: posts.content,
            createdAt: posts.createdAt,
            isDeleted: posts.isDeleted,
            topicId: topics.id,
            topicTitle: topics.title,
            topicSlug: topics.slug,
            boardId: topics.boardId,
          })
          .from(posts)
          .innerJoin(topics, eq(posts.topicId, topics.id))
          .where(eq(posts.authorId, userId))
          // Id breaks ties so equal timestamps still order deterministically.
          .orderBy(desc(posts.createdAt), desc(posts.id))
      );
    },

    async hierarchyBoards() {
      return db
        .select({
          id: boards.id,
          parentId: boards.parentId,
          name: boards.name,
          slug: boards.slug,
          sortOrder: boards.sortOrder,
        })
        .from(boards);
    },
  };
}
