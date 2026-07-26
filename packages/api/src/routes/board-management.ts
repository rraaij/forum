/*
 * Admin board adapters (refactor plan section 6). adminGuard equivalent
 * (`requireAdmin`) applies to the COMPLETE route group; adapters contain
 * only validation, module invocation, and HTTP mapping.
 */

import { Hono } from "hono";
import type { BoardManagement } from "../modules/board-management/types";
import { isDomainError } from "../modules/shared/errors";
import { respondWithDomainError } from "../transport/error-envelope";
import {
  boardIdParamSchema,
  createBoardBodySchema,
  moveBoardBodySchema,
  purgeBoardBodySchema,
  updateBoardBodySchema,
} from "../transport/schemas";
import {
  requireAdmin,
  transportBodyLimit,
  transportValidator,
} from "../transport/validator";
import type { AppEnv } from "../types";

export function createAdminBoardRoutes(boards: BoardManagement) {
  return (
    new Hono<AppEnv>()
      // Guard the whole group, not individual handlers.
      .use("*", requireAdmin)
      .post(
        "/",
        transportBodyLimit(),
        transportValidator("json", createBoardBodySchema),
        async (c) => {
          try {
            return c.json(await boards.createBoard(c.req.valid("json")), 201);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      .patch(
        "/:boardId",
        transportBodyLimit(),
        transportValidator("param", boardIdParamSchema),
        transportValidator("json", updateBoardBodySchema),
        async (c) => {
          try {
            await boards.updateBoard({
              ...c.req.valid("json"),
              boardId: c.req.valid("param").boardId,
            });
            return c.body(null, 204);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      // Reparenting is its own command so hierarchy changes stay explicit.
      .post(
        "/:boardId/move",
        transportBodyLimit(),
        transportValidator("param", boardIdParamSchema),
        transportValidator("json", moveBoardBodySchema),
        async (c) => {
          try {
            await boards.moveBoard({
              ...c.req.valid("json"),
              boardId: c.req.valid("param").boardId,
            });
            return c.body(null, 204);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      .get(
        "/:boardId/purge-impact",
        transportValidator("param", boardIdParamSchema),
        async (c) => {
          try {
            return c.json(
              await boards.previewRecursivePurge(c.req.valid("param").boardId),
            );
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
      .post(
        "/:boardId/purge",
        transportBodyLimit(),
        transportValidator("param", boardIdParamSchema),
        transportValidator("json", purgeBoardBodySchema),
        async (c) => {
          try {
            const counts = await boards.purgeBoardTree({
              ...c.req.valid("json"),
              boardId: c.req.valid("param").boardId,
            });
            return c.json(counts);
          } catch (error) {
            if (isDomainError(error)) return respondWithDomainError(c, error);
            throw error;
          }
        },
      )
  );
}
