/*
 * Board management commands (refactor plan section 5.3). Every command runs
 * in one transaction that has already taken the hierarchy advisory lock;
 * purge additionally takes the exclusive forum-content lock, in that order.
 */

import { validationError } from "../shared/errors";
import {
  boardCycle,
  boardNotFound,
  parentBoardNotFound,
  purgeImpactChanged,
  purgeNameMismatch,
  siblingConflict,
} from "./errors";
import { assertMoveKeepsTreeAcyclic } from "./hierarchy-policy";
import {
  normalizeBoardAbbreviation,
  normalizeBoardDescription,
  normalizeBoardIcon,
  normalizeBoardName,
  normalizeBoardSlug,
  normalizeSortOrder,
} from "./normalization";
import type { BoardManagementStore } from "./repository";
import type {
  BoardManagement,
  BoardPurgeImpactCounts,
  CreateBoardInput,
  UpdateBoardInput,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw validationError("INVALID_ID", `${field} must be a valid ID`, field);
  }
}

function sameCounts(
  left: BoardPurgeImpactCounts,
  right: BoardPurgeImpactCounts,
): boolean {
  return (
    left.boards === right.boards &&
    left.topics === right.topics &&
    left.posts === right.posts &&
    left.reactions === right.reactions &&
    left.votes === right.votes &&
    left.topicViews === right.topicViews
  );
}

export function createBoardManagement(
  store: BoardManagementStore,
): BoardManagement {
  return {
    async createBoard(input: CreateBoardInput) {
      if (input.parentId !== null) assertUuid(input.parentId, "parentId");
      // Normalize once, here — adapters never pre-normalize.
      const name = normalizeBoardName(input.name);
      const slug = normalizeBoardSlug(input.slug);
      const abbreviation = normalizeBoardAbbreviation(input.abbreviation);
      const description = normalizeBoardDescription(input.description);
      const icon = normalizeBoardIcon(input.icon);
      const sortOrder = normalizeSortOrder(input.sortOrder);
      const now = new Date();

      return store.transaction(async (tx) => {
        if (input.parentId !== null) {
          const parent = await tx.findBoard(input.parentId);
          if (!parent) throw parentBoardNotFound();
        }

        const conflict = await tx.findSiblingConflict(input.parentId, {
          name,
          slug,
          abbreviation,
        });
        if (conflict) throw siblingConflict(conflict);

        const boardId = await tx.insertBoard({
          parentId: input.parentId,
          name,
          slug,
          abbreviation,
          description,
          icon,
          sortOrder,
          now,
        });
        return { boardId };
      });
    },

    async updateBoard(input: UpdateBoardInput) {
      assertUuid(input.boardId, "boardId");
      // Only the provided fields are normalized and written; reparenting is
      // a separate command so hierarchy changes stay explicit.
      const values: {
        name?: string;
        slug?: string;
        abbreviation?: string;
        description?: string | null;
        icon?: string | null;
        sortOrder?: number;
      } = {};

      if (input.name !== undefined)
        values.name = normalizeBoardName(input.name);
      if (input.slug !== undefined)
        values.slug = normalizeBoardSlug(input.slug);
      if (input.abbreviation !== undefined) {
        values.abbreviation = normalizeBoardAbbreviation(input.abbreviation);
      }
      if (input.description !== undefined) {
        values.description = normalizeBoardDescription(input.description);
      }
      if (input.icon !== undefined) {
        values.icon = normalizeBoardIcon(input.icon);
      }
      if (input.sortOrder !== undefined) {
        values.sortOrder = normalizeSortOrder(input.sortOrder);
      }

      const now = new Date();

      await store.transaction(async (tx) => {
        const board = await tx.findBoard(input.boardId);
        if (!board) throw boardNotFound();

        const conflict = await tx.findSiblingConflict(
          board.parentId,
          {
            name: values.name,
            slug: values.slug,
            abbreviation: values.abbreviation,
          },
          board.id,
        );
        if (conflict) throw siblingConflict(conflict);

        await tx.updateBoard(board.id, values, now);
      });
    },

    async moveBoard(input) {
      assertUuid(input.boardId, "boardId");
      if (input.newParentId !== null) {
        assertUuid(input.newParentId, "newParentId");
      }
      const sortOrder = normalizeSortOrder(input.sortOrder);
      const now = new Date();

      await store.transaction(async (tx) => {
        const board = await tx.findBoard(input.boardId);
        if (!board) throw boardNotFound();

        if (input.newParentId !== null) {
          const parent = await tx.findBoard(input.newParentId);
          if (!parent) throw parentBoardNotFound();
        }

        // Module-level cycle check for a useful typed error. The hierarchy
        // lock (already held) means the tree cannot change underneath it;
        // the database trigger remains the authoritative backstop.
        if (input.newParentId === input.boardId) throw boardCycle();
        const tree = await tx.allBoards();
        assertMoveKeepsTreeAcyclic(board.id, input.newParentId, tree);

        // Identifiers must stay unique among the NEW siblings.
        const conflict = await tx.findSiblingConflict(
          input.newParentId,
          {
            name: board.name,
            slug: board.slug,
            abbreviation: board.abbreviation,
          },
          board.id,
        );
        if (conflict) throw siblingConflict(conflict);

        await tx.moveBoard(board.id, input.newParentId, sortOrder, now);
      });
    },

    async previewRecursivePurge(boardId) {
      assertUuid(boardId, "boardId");
      return store.transaction(async (tx) => {
        const board = await tx.findBoard(boardId);
        if (!board) throw boardNotFound();
        return {
          boardId: board.id,
          boardName: board.name,
          counts: await tx.countSubtree(board.id),
        };
      });
    },

    async purgeBoardTree(input) {
      assertUuid(input.boardId, "boardId");

      return store.transaction(async (tx) => {
        // Hierarchy lock is already held; take the exclusive content lock
        // second (never the reverse) so no content write can slip between
        // the recount and the delete.
        await tx.lockForumContentExclusive();

        const board = await tx.findBoard(input.boardId);
        if (!board) throw boardNotFound();

        // Advisory locks exclude participating writers; row locks additionally
        // protect the exact subtree from direct SQL while impact is recounted.
        await tx.lockSubtree(board.id);

        // Exact, case-sensitive confirmation of the board name.
        if (input.confirmationName !== board.name) throw purgeNameMismatch();

        const counts = await tx.countSubtree(board.id);
        if (!sameCounts(counts, input.expectedImpact)) {
          // Nothing is deleted: the caller must review the new impact.
          throw purgeImpactChanged();
        }

        await tx.deleteBoardTree(board.id);
        return counts;
      });
    },
  };
}
