import { createSignal } from "solid-js";

/*
 * A module-level signal lets the profile editor preview a newly selected avatar
 * in the persistent application header before the database save completes.
 * Undefined means "use the authenticated session image"; null explicitly
 * previews removing the avatar.
 */
const [profileAvatarPreview, setProfileAvatarPreview] = createSignal<
  string | null | undefined
>(undefined);

export { profileAvatarPreview, setProfileAvatarPreview };
