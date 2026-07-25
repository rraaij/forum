import { z } from "zod";

/*
 * Structural bounds for the profile replacement command (plan 6.1). Deep
 * rules — MIME type, decoded image bytes, date validity, text lengths —
 * are domain policy and live in the profile-edit module, which re-checks
 * everything here because non-HTTP callers can invoke it directly.
 *
 * Where a rule exists at BOTH seams, the transport message is deliberately
 * identical to the module's, so the user sees the same wording no matter
 * which seam rejected the value.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const PROFILE_MAX_PHOTOS = 12;

// PUT /api/profile — replacement: photoUrls is always required.
export const updateProfileBodySchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, "Display name must be at most 80 characters")
    .nullish(),
  dateOfBirth: z
    .string()
    .regex(DATE_PATTERN, "Date of birth must use YYYY-MM-DD")
    .nullish(),
  profileText: z
    .string()
    .max(2_000, "Profile text must be at most 2000 characters")
    .nullish(),
  image: z.string().nullish(),
  location: z
    .string()
    .trim()
    .max(100, "Location must be at most 100 characters")
    .nullish(),
  website: z
    .string()
    .max(2_000, "Website must be at most 2000 characters")
    .nullish(),
  photoUrls: z
    .array(z.string(), { message: "Photos must be an array of images" })
    .max(
      PROFILE_MAX_PHOTOS,
      `A profile can contain up to ${PROFILE_MAX_PHOTOS} photos`,
    ),
});

// PUT /api/profile/avatar
export const updateAvatarBodySchema = z.object({
  image: z.string().nullable(),
});
