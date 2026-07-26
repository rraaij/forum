/*
 * Building blocks for the replacement transport schemas (plan section 6.1).
 * Transport validation is NOT the domain security seam: modules repeat all
 * domain invariants. These schemas bound what may enter an adapter at all.
 */

import { z } from "zod";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from "../../modules/shared/pagination";

/** Canonical UUID; Better Auth text actor IDs are the documented exception. */
export const uuidSchema = z.uuid();

/** Slug path segments are looked up case-insensitively server-side. */
export const slugSegmentSchema = z.string().trim().min(1).max(200);

/** Opaque base64url cursor; decoding/versioning is validated by the module. */
export const cursorSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/, "Cursor is malformed");

/** Query-string page limit: integer 1..100, default 25. */
export const pageLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_LIMIT)
  .default(DEFAULT_PAGE_LIMIT);
