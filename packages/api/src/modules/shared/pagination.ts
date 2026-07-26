/*
 * Keyset pagination contracts (refactor plan sections 5.2 and 6.1).
 *
 * Cursors are versioned, encoded as opaque base64url JSON, and runtime-
 * validated on decode. Topic ordering is (isPinned DESC, lastActivityAt DESC,
 * id DESC); reply ordering is (createdAt ASC, id ASC). Tampered, malformed,
 * or unsupported cursors yield a typed validation error.
 */

import { z } from "zod";
import { validationError } from "./errors";

export interface PageRequest {
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;

/*
 * Modules repeat this bound even though transport validation already clamps
 * it, because non-HTTP callers can invoke them directly (plan section 6.1).
 */
export function normalizePageLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PAGE_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw validationError(
      "INVALID_PAGE_LIMIT",
      `Page limit must be an integer between 1 and ${MAX_PAGE_LIMIT}`,
      "limit",
    );
  }
  return limit;
}

const topicCursorSchema = z
  .object({
    version: z.literal(1),
    isPinned: z.boolean(),
    lastActivityAt: z.iso.datetime(),
    id: z.uuid(),
  })
  .strict();

const replyCursorSchema = z
  .object({
    version: z.literal(1),
    createdAt: z.iso.datetime(),
    id: z.uuid(),
  })
  .strict();

export type TopicCursor = z.infer<typeof topicCursorSchema>;
export type ReplyCursor = z.infer<typeof replyCursorSchema>;

function encodeCursor(payload: TopicCursor | ReplyCursor): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor<T>(raw: string, schema: z.ZodType<T>, label: string): T {
  let parsedJson: unknown;
  try {
    if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error("invalid");
    const decoded = Buffer.from(raw, "base64url");
    // Node's decoder is intentionally permissive. Re-encoding rejects extra
    // ignored characters and every other non-canonical representation.
    if (decoded.toString("base64url") !== raw) throw new Error("invalid");
    parsedJson = JSON.parse(decoded.toString("utf8"));
  } catch {
    throw validationError(
      "INVALID_CURSOR",
      `${label} cursor is malformed`,
      "cursor",
    );
  }
  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    throw validationError(
      "INVALID_CURSOR",
      `${label} cursor is invalid or uses an unsupported version`,
      "cursor",
    );
  }
  return result.data;
}

export function encodeTopicCursor(
  cursor: Omit<TopicCursor, "version">,
): string {
  return encodeCursor({ version: 1, ...cursor });
}

export function decodeTopicCursor(raw: string): TopicCursor {
  return decodeCursor(raw, topicCursorSchema, "Topic");
}

export function encodeReplyCursor(
  cursor: Omit<ReplyCursor, "version">,
): string {
  return encodeCursor({ version: 1, ...cursor });
}

export function decodeReplyCursor(raw: string): ReplyCursor {
  return decodeCursor(raw, replyCursorSchema, "Reply");
}
