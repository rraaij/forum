import { conflictError, forbiddenError, notFoundError } from "../shared/errors";

export const topicNotFound = () =>
  notFoundError("TOPIC_NOT_FOUND", "Topic not found");

export const postNotFound = () =>
  notFoundError("POST_NOT_FOUND", "Post not found");

export const boardNotFound = () =>
  notFoundError("BOARD_NOT_FOUND", "Board not found");

export const topicLocked = () =>
  forbiddenError("TOPIC_LOCKED", "Topic is locked");

export const newTopicsDisabled = () =>
  forbiddenError(
    "NEW_TOPICS_DISABLED",
    "New topics are disabled in this board",
  );

export const notPostAuthor = () =>
  forbiddenError("NOT_POST_AUTHOR", "Only the author may modify this post");

/** Global case-insensitive slug collision; no silent suffixing (plan 4.2). */
export const topicSlugConflict = (slug: string) =>
  conflictError(
    "TOPIC_SLUG_CONFLICT",
    `A topic with slug "${slug}" already exists; choose a different title`,
    "title",
  );

export const openingPostUndeletable = () =>
  forbiddenError(
    "OPENING_POST_UNDELETABLE",
    "The opening post of a topic cannot be deleted",
  );

export const deletedPostImmutable = () =>
  conflictError("POST_DELETED", "A deleted post cannot be edited");

export const deletedPostUnquotable = () =>
  conflictError("QUOTED_POST_DELETED", "A deleted post cannot be quoted");
