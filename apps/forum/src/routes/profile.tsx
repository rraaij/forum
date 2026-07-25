import { createFileRoute, Link } from "@tanstack/solid-router";
import { createResource, For, Show } from "solid-js";
import { ActivityTopicLink } from "@/features/profile-activity/ActivityTopicLink";
import {
  type EditableProfile,
  fetchProfile,
} from "@/features/profile-edit/api";
import { ChangePasswordDialog } from "@/features/profile-edit/ChangePasswordDialog";
import { ProfileForm } from "@/features/profile-edit/ProfileForm";
import { ProfileGallery } from "@/features/profile-edit/ProfileGallery";
import { createProfileEditor } from "@/features/profile-edit/use-profile-editor";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import type { UserPostActivity } from "@/types/forum";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function ProfilePage() {
  const session = useSession();
  const signedIn = () => Boolean(session().data?.user);

  /*
   * Profile and activity are fetched in the browser so the requests carry
   * the Better Auth cookie. Activity still uses the legacy endpoint and
   * moves to the ProfileActivity module in Phase 7.
   */
  const [profile] = createResource(signedIn, fetchProfile);
  const [activity] = createResource(signedIn, () =>
    apiFetch<UserPostActivity[]>("/profile/activity"),
  );

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

        <section class="card border border-base-content/10 bg-base-100 shadow-sm">
          <div class="card-body gap-3">
            <h2 class="text-sm font-bold uppercase tracking-wide">
              Your activity
            </h2>
            <Show
              when={(activity()?.length ?? 0) > 0}
              fallback={
                <p class="text-sm text-base-content/60">No posts yet.</p>
              }
            >
              <div class="overflow-x-auto">
                <table class="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Kind</th>
                      <th>Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={activity()}>
                      {(item) => (
                        <tr>
                          <td>
                            <ActivityTopicLink activity={item} />
                          </td>
                          <td>
                            <span class="badge badge-ghost badge-sm">
                              {item.isTopicStart ? "Opening post" : "Reply"}
                            </span>
                          </td>
                          <td class="text-sm text-base-content/70">
                            {formatDateTime(item.postCreatedAt)}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </section>
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
