import { notFoundError } from "../shared/errors";

export const categoryNotFound = () =>
  notFoundError("CATEGORY_NOT_FOUND", "Category not found");

export const forumTopicNotFound = () =>
  notFoundError("TOPIC_NOT_FOUND", "Topic not found");

/*
 * A board that exists but does not descend from the requested category slug
 * is presented as absent, not as a redirect (plan section 5.2).
 */
export const boardAncestryMismatch = () =>
  notFoundError("BOARD_NOT_FOUND", "Board not found in this category");
