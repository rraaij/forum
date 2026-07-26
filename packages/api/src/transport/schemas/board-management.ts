import { z } from "zod";
import {
  BOARD_ABBREVIATION_MAX,
  BOARD_DESCRIPTION_MAX,
  BOARD_ICON_MAX,
  BOARD_NAME_MAX,
  BOARD_SLUG_MAX,
} from "../../modules/board-management/normalization";
import { uuidSchema } from "./shared";

export const boardIdParamSchema = z.object({ boardId: uuidSchema });

const boardFields = {
  name: z.string().trim().min(1).max(BOARD_NAME_MAX),
  slug: z.string().trim().min(1).max(BOARD_SLUG_MAX),
  abbreviation: z.string().trim().min(1).max(BOARD_ABBREVIATION_MAX),
  description: z.string().max(BOARD_DESCRIPTION_MAX).nullish(),
  icon: z.string().max(BOARD_ICON_MAX).nullish(),
  sortOrder: z.number().int().min(0).optional(),
};

// POST /api/admin/boards — parentId must be explicit: null means root.
export const createBoardBodySchema = z.object({
  parentId: uuidSchema.nullable(),
  ...boardFields,
});

// PATCH /api/admin/boards/:boardId — reparenting goes through move, not update.
export const updateBoardBodySchema = z.object(boardFields).partial();

// POST /api/admin/boards/:boardId/move
export const moveBoardBodySchema = z.object({
  newParentId: uuidSchema.nullable(),
  sortOrder: z.number().int().min(0),
});

const impactCountSchema = z.number().int().min(0);

export const purgeImpactCountsSchema = z.object({
  boards: impactCountSchema,
  topics: impactCountSchema,
  posts: impactCountSchema,
  reactions: impactCountSchema,
  votes: impactCountSchema,
  topicViews: impactCountSchema,
});

// POST /api/admin/boards/:boardId/purge
export const purgeBoardBodySchema = z.object({
  confirmationName: z.string().min(1).max(BOARD_NAME_MAX),
  expectedImpact: purgeImpactCountsSchema,
});
