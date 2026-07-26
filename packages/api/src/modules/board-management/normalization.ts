/*
 * Board field normalization (refactor plan sections 4.1 and 5.3): every
 * command normalizes name, slug, abbreviation, description, icon, and sort
 * order exactly once through these functions. Pure and unit-tested.
 */

import { validationError } from "../shared/errors";

export const BOARD_NAME_MAX = 200;
export const BOARD_SLUG_MAX = 200;
export const BOARD_ABBREVIATION_MAX = 5;
export const BOARD_DESCRIPTION_MAX = 2_000;
export const BOARD_ICON_MAX = 200;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeBoardName(raw: string): string {
  const name = raw.trim();
  if (name.length < 1 || name.length > BOARD_NAME_MAX) {
    throw validationError(
      "INVALID_BOARD_NAME",
      `Name must contain between 1 and ${BOARD_NAME_MAX} characters`,
      "name",
    );
  }
  return name;
}

export function normalizeBoardSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (slug.length < 1 || slug.length > BOARD_SLUG_MAX) {
    throw validationError(
      "INVALID_BOARD_SLUG",
      `Slug must contain between 1 and ${BOARD_SLUG_MAX} characters`,
      "slug",
    );
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw validationError(
      "INVALID_BOARD_SLUG",
      "Slug may only contain lowercase letters, digits, and single hyphens",
      "slug",
    );
  }
  return slug;
}

export function normalizeBoardAbbreviation(raw: string): string {
  const abbreviation = raw.trim().toUpperCase();
  if (abbreviation.length < 1 || abbreviation.length > BOARD_ABBREVIATION_MAX) {
    throw validationError(
      "INVALID_BOARD_ABBREVIATION",
      `Abbreviation must contain between 1 and ${BOARD_ABBREVIATION_MAX} characters`,
      "abbreviation",
    );
  }
  return abbreviation;
}

/** Trimmed; empty becomes null (plan section 4.1). */
export function normalizeBoardDescription(
  raw: string | null | undefined,
): string | null {
  const description = raw?.trim() ?? "";
  if (description.length > BOARD_DESCRIPTION_MAX) {
    throw validationError(
      "INVALID_BOARD_DESCRIPTION",
      `Description must contain at most ${BOARD_DESCRIPTION_MAX} characters`,
      "description",
    );
  }
  return description || null;
}

export function normalizeBoardIcon(
  raw: string | null | undefined,
): string | null {
  const icon = raw?.trim() ?? "";
  if (icon.length > BOARD_ICON_MAX) {
    throw validationError(
      "INVALID_BOARD_ICON",
      `Icon must contain at most ${BOARD_ICON_MAX} characters`,
      "icon",
    );
  }
  return icon || null;
}

/** Non-negative integer; default 0 (plan section 4.1). */
export function normalizeSortOrder(raw: number | undefined): number {
  if (raw === undefined) return 0;
  if (!Number.isInteger(raw) || raw < 0) {
    throw validationError(
      "INVALID_SORT_ORDER",
      "Sort order must be a non-negative integer",
      "sortOrder",
    );
  }
  return raw;
}
