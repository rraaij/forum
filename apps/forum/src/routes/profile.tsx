import { Button } from "@forum/ui";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createResource, Show } from "solid-js";
import { ActivityPanel } from "@/features/profile-activity/ActivityPanel";
import {
  fetchProfileActivity,
  type ProfileActivity,
} from "@/features/profile-activity/api";
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
    <div class="-mx-4 -my-2 bg-base-200 text-base-content">
      <Show
        when={signedIn()}
        fallback={
          <p class="px-6 py-10 text-sm text-brand-700 sm:px-10">
            <Link to="/auth/sign-in" class="font-semibold text-primary">
              Log in
            </Link>{" "}
            om je profiel te bewerken.
          </p>
        }
      >
        <Show
          when={profile()}
          fallback={
            <p class="px-6 py-10 text-sm text-brand-700 sm:px-10">Laden…</p>
          }
        >
          {(loaded) => (
            <ProfileEditorSections profile={loaded()} activity={activity()} />
          )}
        </Show>
      </Show>
    </div>
  );
}

/*
 * Split out so the editor controller is created once the profile has
 * loaded, with real initial values.
 */
function ProfileEditorSections(props: {
  profile: EditableProfile;
  activity: ProfileActivity | undefined;
}) {
  const editor = createProfileEditor(() => props.profile);

  return (
    <div>
      <header class="flex flex-wrap items-end justify-between gap-5 border-b-2 border-base-content px-6 py-7 sm:px-10">
        <div>
          <p class="text-[13.5px] text-brand-700">
            Alles hier is van jou — wijzig gerust, niemand kijkt mee.
          </p>
          <h1 class="mt-1 text-[42px] leading-none font-semibold">
            Je profiel
          </h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <details class="relative">
            <summary class="btn list-none rounded-none border-brand-300 bg-base-300 font-bold shadow-none">
              Wachtwoord wijzigen
            </summary>
            <div class="absolute top-full right-0 z-20 mt-2 w-[min(46rem,calc(100vw-2rem))]">
              <ChangePasswordDialog
                onSuccess={() => {
                  editor.clearMessages();
                }}
              />
            </div>
          </details>
          <Button
            variant="primary"
            loading={editor.saving()}
            onClick={() => void editor.save()}
          >
            {editor.saving() ? "Profiel opslaan…" : "Profiel opslaan"}
          </Button>
        </div>
      </header>

      <Show when={editor.error()}>
        {(message) => (
          <div
            class="border-b border-error bg-error/10 px-6 py-3 text-sm text-error sm:px-10"
            role="alert"
          >
            {message()}
          </div>
        )}
      </Show>
      <Show when={editor.success()}>
        {(message) => (
          <div
            class="border-b border-success bg-success/10 px-6 py-3 text-sm text-success sm:px-10"
            role="status"
          >
            {message()}
          </div>
        )}
      </Show>

      <div class="grid md:grid-cols-[300px_1fr]">
        <ProfileForm
          profile={props.profile}
          activity={props.activity}
          editor={editor}
        />
        <ProfileGallery editor={editor} />
        <ActivityPanel activity={props.activity} />
      </div>
    </div>
  );
}
