/*
 * Profile image policy (refactor plan section 5.4). These rules are ported
 * verbatim from the pre-refactor route handler and are covered by the
 * Phase 0 characterization tests: the accepted VALUES must not change.
 *
 * The server is authoritative here. The browser repeats the same checks for
 * fast feedback (features/profile-edit/image-file-policy.ts), but nothing
 * the browser does can widen what is accepted.
 */

import { validationError } from "../shared/errors";
import { optionalText } from "./validation";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_PHOTOS = 12;

const IMAGE_DATA_PATTERN =
  /^data:image\/(?:jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;

/*
 * Base64 is roughly one third larger than the source file. The generous
 * text bound below only stops absurd payloads early; the exact decoded
 * byte check further down is what enforces the 2 MB limit.
 */
const MAX_IMAGE_TEXT_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100;

export function optionalUrl(
  value: unknown,
  label: string,
  key: string,
): string | null {
  const normalized = optionalText(value, label, key, 2_000);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      `${label} must be a valid http(s) URL`,
      key,
    );
  }

  return normalized;
}

export function optionalImage(
  value: unknown,
  label: string,
  key: string,
): string | null {
  const normalized = optionalText(value, label, key, MAX_IMAGE_TEXT_LENGTH);
  if (!normalized) return null;

  /*
   * Existing http(s) images stay valid for backwards compatibility, but
   * every new file selected in the profile UI arrives as a data URL and is
   * therefore stored directly in PostgreSQL.
   */
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return optionalUrl(normalized, label, key);
  }

  const match = normalized.match(IMAGE_DATA_PATTERN);
  if (!match) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      `${label} must be a JPEG, PNG, WebP, or GIF image selected from your device`,
      key,
    );
  }

  const base64 = match[1];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = Math.floor((base64.length * 3) / 4) - padding;
  if (byteLength > MAX_IMAGE_BYTES) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      `${label} must be no larger than 2 MB`,
      key,
    );
  }

  return normalized;
}

/** Validates the complete gallery, rejecting before anything is written. */
export function normalizeGallery(photoUrls: unknown): string[] {
  if (!Array.isArray(photoUrls)) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      "Photos must be an array of images",
      "photoUrls",
    );
  }
  if (photoUrls.length > MAX_PHOTOS) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      `A profile can contain up to ${MAX_PHOTOS} photos`,
      "photoUrls",
    );
  }

  return photoUrls.map((photo, index) => {
    const label = `Photo ${index + 1}`;
    const validated = optionalImage(photo, label, "photoUrls");
    if (!validated) {
      throw validationError(
        "INVALID_PROFILE_FIELD",
        `${label} cannot be empty`,
        "photoUrls",
      );
    }
    return validated;
  });
}
