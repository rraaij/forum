/*
 * Immutable quote snapshot (refactor plan section 4.3).
 *
 * A reply may embed a snapshot of the quoted post taken inside the reply
 * transaction. Later edits or deletion of the source post never change the
 * snapshot. Snapshot fields are NEVER accepted from the browser; the module
 * builds them from the source row. This schema validates what is stored in
 * and read from posts.quote_snapshot.
 */

import { z } from "zod";
import { validationError } from "./errors";

export interface QuoteSnapshotV1 {
  version: 1;
  sourcePostId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export const quoteSnapshotV1Schema = z.object({
  version: z.literal(1),
  sourcePostId: z.uuid(),
  authorName: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export function parseQuoteSnapshot(value: unknown): QuoteSnapshotV1 {
  const result = quoteSnapshotV1Schema.safeParse(value);
  if (!result.success) {
    throw validationError(
      "INVALID_QUOTE_SNAPSHOT",
      "Quote snapshot is invalid or uses an unsupported version",
    );
  }
  return result.data;
}
