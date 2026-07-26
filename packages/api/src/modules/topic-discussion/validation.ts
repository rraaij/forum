/*
 * Pure topic/post field validation and normalization (plan sections 5.1 and
 * 6.1). These bounds are enforced at BOTH the transport seam and here in the
 * module, because non-HTTP callers can invoke modules directly.
 */

import { validationError } from "../shared/errors";

export const TOPIC_TITLE_MIN = 3;
export const TOPIC_TITLE_MAX = 200;
export const POST_CONTENT_MAX = 50_000;

export function normalizeTopicTitle(raw: string): string {
  const title = raw.trim();
  if (title.length < TOPIC_TITLE_MIN || title.length > TOPIC_TITLE_MAX) {
    throw validationError(
      "INVALID_TOPIC_TITLE",
      `Title must contain between ${TOPIC_TITLE_MIN} and ${TOPIC_TITLE_MAX} characters`,
      "title",
    );
  }
  return title;
}

export function normalizePostContent(raw: string): string {
  const content = raw.trim();
  if (content.length < 1 || content.length > POST_CONTENT_MAX) {
    throw validationError(
      "INVALID_POST_CONTENT",
      `Content must contain between 1 and ${POST_CONTENT_MAX} characters`,
      "content",
    );
  }
  return content;
}

/*
 * The module must generate a non-empty slug (plan 4.2). Titles that reduce
 * to nothing (e.g. "!!!") are rejected instead of silently substituted.
 */
export function generateTopicSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) {
    throw validationError(
      "INVALID_TOPIC_TITLE",
      "Title must contain at least one letter or digit",
      "title",
    );
  }
  return slug;
}
