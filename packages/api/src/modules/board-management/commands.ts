/*
 * Board management commands (refactor plan section 5.3). Every command runs
 * in one transaction that has already taken the hierarchy advisory lock;
 * purge additionally takes the exclusive forum-content lock, in that order.
 */

import { validationError } from "../shared/errors";
import {
  boardCycle,
  boardNotFound,
  boardOrderChanged,
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
      const isGuestVisible = input.isGuestVisible ?? true;
      const allowNewTopics = input.allowNewTopics ?? true;
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
          isGuestVisible,
          allowNewTopics,
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
        isGuestVisible?: boolean;
        allowNewTopics?: boolean;
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
      if (input.isGuestVisible !== undefined) {
        values.isGuestVisible = input.isGuestVisible;
      }
      if (input.allowNewTopics !== undefined) {
        values.allowNewTopics = input.allowNewTopics;
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

    async reorderBoardGroups(input) {
      if (input.groups.length === 0) {
        throw validationError(
          "EMPTY_BOARD_ORDER",
          "At least one sibling group is required",
          "groups",
        );
      }
      const parentKeys = new Set<string>();
      const submittedBoardIds = new Set<string>();
      for (const group of input.groups) {
        if (group.parentId !== null) assertUuid(group.parentId, "parentId");
        const parentKey = group.parentId ?? "root";
        if (parentKeys.has(parentKey)) {
          throw validationError(
            "DUPLICATE_BOARD_ORDER_GROUP",
            "Each sibling group may appear only once",
            "groups",
          );
        }
        parentKeys.add(parentKey);
        if (group.boardIds.length === 0) {
          throw validationError(
            "EMPTY_BOARD_ORDER_GROUP",
            "A sibling group cannot be empty",
            "boardIds",
          );
        }
        for (const boardId of group.boardIds) {
          assertUuid(boardId, "boardId");
          if (submittedBoardIds.has(boardId)) {
            throw validationError(
              "DUPLICATE_BOARD_ORDER_ID",
              "A board may appear in only one order group",
              "boardIds",
            );
          }
          submittedBoardIds.add(boardId);
        }
      }

      return store.transaction(async (tx) => {
        const boards = await tx.allBoards();
        for (const group of input.groups) {
          const actualIds = [...boards.values()]
            .filter((board) => board.parentId === group.parentId)
            .map((board) => board.id);
          if (
            actualIds.length !== group.boardIds.length ||
            actualIds.some((boardId) => !group.boardIds.includes(boardId))
          ) {
            throw boardOrderChanged();
          }
        }

        const now = new Date();
        await tx.reorderBoardGroups(input.groups, now);
        return {
          groups: input.groups.length,
          boards: input.groups.reduce(
            (total, group) => total + group.boardIds.length,
            0,
          ),
        };
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
