/*
 * Profile field validation (plan section 5.4), ported verbatim from the
 * pre-refactor route so the accepted values are unchanged. `label` is the
 * human wording used in messages the UI shows; `key` is the transport field
 * name reported in the error envelope.
 */

import { validationError } from "../shared/errors";

export const DISPLAY_NAME_MAX = 80;
export const PROFILE_TEXT_MAX = 2_000;
export const LOCATION_MAX = 100;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function optionalText(
  value: unknown,
  label: string,
  key: string,
  maximumLength: number,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      `${label} must be text`,
      key,
    );
  }

  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      `${label} must be at most ${maximumLength} characters`,
      key,
    );
  }

  // Empty text is stored as NULL rather than an empty string.
  return normalized || null;
}

export function normalizeDateOfBirth(value: unknown): string | null {
  const dateOfBirth = optionalText(value, "Date of birth", "dateOfBirth", 10);
  if (!dateOfBirth) return null;

  if (!DATE_PATTERN.test(dateOfBirth)) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      "Date of birth must use YYYY-MM-DD",
      "dateOfBirth",
    );
  }

  const parsedDate = new Date(`${dateOfBirth}T00:00:00Z`);
  // Round-tripping catches impossible calendar dates such as 1990-02-30,
  // which Date otherwise rolls forward into March.
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateOfBirth
  ) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      "Date of birth is not a valid date",
      "dateOfBirth",
    );
  }
  if (parsedDate > new Date()) {
    throw validationError(
      "INVALID_PROFILE_FIELD",
      "Date of birth cannot be in the future",
      "dateOfBirth",
    );
  }

  return dateOfBirth;
}
