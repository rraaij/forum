import type { EditableProfile } from "./types";

/*
 * The columns this mapper reads, declared structurally so the module stays
 * free of Drizzle types; the repository supplies the row.
 */
export interface ProfileRow {
  name: string | null;
  email: string;
  displayName: string | null;
  dateOfBirth: string | null;
  profileText: string | null;
  image: string | null;
  location: string | null;
  website: string | null;
  photoUrls: string[];
}

/*
 * The single place that shapes a user row into the editable profile. The
 * Better Auth `name` is deliberately exposed as `username` and never
 * accepted as input, which makes its immutability an API-level guarantee
 * rather than a UI convention.
 */
export function toEditableProfile(user: ProfileRow): EditableProfile {
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
