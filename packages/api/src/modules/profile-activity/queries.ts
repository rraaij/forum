/*
 * Profile activity read model (refactor plan section 5.5).
 *
 * Every item carries the post's own kind, its deletion state, board
 * breadcrumbs and canonical route params produced by the SHARED hierarchy
 * mapper — the same one the forum read model uses, so link policy exists in
 * exactly one place. Returning all activity is a recorded decision; the
 * large-fixture integration test keeps its cost visible.
 */

import { buildBoardHierarchy } from "../shared/board-hierarchy";
import type { ProfileActivityStore } from "./repository";
import type { ProfileActivity, ProfileActivityItem } from "./types";

export function createProfileActivity(
  store: ProfileActivityStore,
): ProfileActivity {
  return {
    async getAllForUser(userId: string): Promise<ProfileActivityItem[]> {
      return store.transaction(async (tx) => {
        // Two fixed queries, sharing one repeatable-read snapshot regardless
        // of how much the author posted or whether a purge commits mid-read.
        const rows = await tx.postsByAuthor(userId);
        const boardRows = await tx.hierarchyBoards();
        const hierarchy = buildBoardHierarchy(boardRows);

        return rows.map((row) => ({
          postId: row.postId,
          postKind: row.kind,
          postContent: row.content,
          postCreatedAt: row.createdAt.toISOString(),
          isDeleted: row.isDeleted,
          topicId: row.topicId,
          topicTitle: row.topicTitle,
          topicSlug: row.topicSlug,
          breadcrumbs: hierarchy.breadcrumbs(row.boardId),
          routeParams: hierarchy.topicRouteParams(row.boardId, row.topicSlug),
        }));
      });
    },
  };
}
