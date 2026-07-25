import type { users } from "@forum/db/schema";
import type { EditableProfile } from "./types";

/*
 * The single place that shapes a user row into the editable profile. The
 * Better Auth `name` is deliberately exposed as `username` and never
 * accepted as input, which makes its immutability an API-level guarantee
 * rather than a UI convention.
 */
export function toEditableProfile(
  user: typeof users.$inferSelect,
): EditableProfile {
  return {
    username: user.name ?? "",
    email: user.email,
    displayName: user.displayName,
    dateOfBirth: user.dateOfBirth,
    profileText: user.profileText,
    image: user.image,
    location: user.location,
    website: user.website,
    photoUrls: user.photoUrls,
  };
}
