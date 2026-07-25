import { createFileRoute, Link } from "@tanstack/solid-router";
import { createResource, Show } from "solid-js";
import { ActivityPanel } from "@/features/profile-activity/ActivityPanel";
import { fetchProfileActivity } from "@/features/profile-activity/api";
import {
  type EditableProfile,
  fetchProfile,
} from "@/features/profile-edit/api";
import { ChangePasswordDialog } from "@/features/profile-edit/ChangePasswordDialog";
import { ProfileForm } from "@/features/profile-edit/ProfileForm";
import { ProfileGallery } from "@/features/profile-edit/ProfileGallery";
import { createProfileEditor } from "@/features/profile-edit/use-profile-editor";
import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const session = useSession();
  const signedIn = () => Boolean(session().data?.user);

  /*
   * Profile and activity are fetched in the browser so the requests carry
   * the Better Auth cookie.
   */
  const [profile] = createResource(signedIn, fetchProfile);
  const [activity] = createResource(signedIn, fetchProfileActivity);

  return (
    <div class="space-y-4">
      <h1 class="text-2xl font-black">Your profile</h1>

      <Show
        when={signedIn()}
        fallback={
          <p class="text-sm text-base-content/60">
            <Link to="/auth/sign-in" class="link link-primary">
              Sign in
            </Link>{" "}
            to edit your profile.
          </p>
        }
      >
        <Show
          when={profile()}
          fallback={<p class="text-sm text-base-content/60">Loading…</p>}
        >
          {(loaded) => <ProfileEditorSections profile={loaded()} />}
        </Show>

        <ActivityPanel activity={activity()} />
      </Show>
    </div>
  );
}

/*
 * Split out so the editor controller is created once the profile has
 * loaded, with real initial values.
 */
function ProfileEditorSections(props: { profile: EditableProfile }) {
  const editor = createProfileEditor(() => props.profile);

  return (
    <div class="space-y-4">
      <Show when={editor.error()}>
        {(message) => (
          <div class="alert alert-error py-2 text-sm" role="alert">
            <span>{message()}</span>
          </div>
        )}
      </Show>
      <Show when={editor.success()}>
        {(message) => (
          <div class="alert alert-success py-2 text-sm" role="status">
            <span>{message()}</span>
          </div>
        )}
      </Show>

      <ProfileForm profile={props.profile} editor={editor} />
      <ProfileGallery editor={editor} />

      <div class="flex justify-end">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          disabled={editor.saving()}
          onClick={() => void editor.save()}
        >
          {editor.saving() ? (
            <span class="loading loading-spinner loading-xs" />
          ) : (
            "Save profile"
          )}
        </button>
      </div>

      <ChangePasswordDialog
        onSuccess={() => {
          editor.clearMessages();
        }}
      />
    </div>
  );
}
