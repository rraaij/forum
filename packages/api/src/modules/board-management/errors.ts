import {
  conflictError,
  notFoundError,
  validationError,
} from "../shared/errors";

export const boardNotFound = () =>
  notFoundError("BOARD_NOT_FOUND", "Board not found");

export const parentBoardNotFound = () =>
  notFoundError("PARENT_BOARD_NOT_FOUND", "Parent board not found");

/** Self-parenting and descendant moves are cycles (plan section 5.3). */
export const boardCycle = () =>
  conflictError(
    "BOARD_CYCLE",
    "A board cannot become its own ancestor or parent",
  );

export const boardOrderChanged = () =>
  conflictError(
    "BOARD_ORDER_CHANGED",
    "The sibling set changed while its order was being edited; reload and try again",
  );

/** Sibling uniqueness errors identify the conflicting field. */
export const siblingConflict = (field: "name" | "slug" | "abbreviation") =>
  conflictError(
    "BOARD_SIBLING_CONFLICT",
    `A sibling board already uses this ${field}`,
    field,
  );

export const purgeNameMismatch = () =>
  validationError(
    "PURGE_NAME_MISMATCH",
    "Confirmation name does not exactly match the board name",
    "confirmationName",
  );

/** Submitted counts went stale; nothing was deleted (plan section 5.3). */
export const purgeImpactChanged = () =>
  conflictError(
    "PURGE_IMPACT_CHANGED",
    "Board contents changed since the purge preview; review the new impact",
  );
