import { createHash } from "node:crypto";
import { z } from "zod";
import { validationError } from "../shared/errors";
import type { SearchSort } from "./types";

const cursorSchema = z
  .object({
    version: z.literal(1),
    fingerprint: z.string().length(24),
    sort: z.enum(["newest", "relevance"]),
    matchedAt: z.iso.datetime(),
    topicId: z.uuid(),
    rank: z.number().finite().nonnegative().optional(),
    cutoff: z.iso.datetime().nullable(),
  })
  .strict();

export type SearchCursor = z.infer<typeof cursorSchema>;

export function searchFingerprint(input: {
  q: string;
  boardId?: string;
  topicsOnly: boolean;
  authorId?: string;
  latestMonth: boolean;
  sort: SearchSort;
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("base64url")
    .slice(0, 24);
}

export function encodeSearchCursor(
  cursor: Omit<SearchCursor, "version">,
): string {
  return Buffer.from(
    JSON.stringify({ version: 1, ...cursor }),
    "utf8",
  ).toString("base64url");
}

export function decodeSearchCursor(
  raw: string,
  fingerprint: string,
  sort: SearchSort,
): SearchCursor {
  let json: unknown;
  try {
    if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error("invalid");
    const decoded = Buffer.from(raw, "base64url");
    if (decoded.toString("base64url") !== raw) throw new Error("invalid");
    json = JSON.parse(decoded.toString("utf8"));
  } catch {
    throw validationError(
      "INVALID_CURSOR",
      "Search cursor is malformed",
      "cursor",
    );
  }
  const parsed = cursorSchema.safeParse(json);
  if (
    !parsed.success ||
    parsed.data.fingerprint !== fingerprint ||
    parsed.data.sort !== sort ||
    (sort === "relevance" && parsed.data.rank === undefined)
  ) {
    throw validationError(
      "INVALID_CURSOR",
      "Search cursor does not match this search",
      "cursor",
    );
  }
  return parsed.data;
}
