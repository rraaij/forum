import { Button, ErrorState, NoAccessState, Skeleton } from "@forum/ui";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createResource, createSignal, Match, Show, Switch } from "solid-js";
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
  const [profile, { refetch: refetchProfile }] = createResource(
    signedIn,
    fetchProfile,
  );
  const [activity, { refetch: refetchActivity }] = createResource(
    signedIn,
    fetchProfileActivity,
  );

  const retry = () =>
    Promise.all([refetchProfile(), refetchActivity()]).then(() => undefined);

  return (
    <div class="bg-base-200 text-base-content">
      <Switch>
        <Match when={session().isPending}>
          <Skeleton
            class="border-x-0 border-t-0"
            label="Profiel laden"
            rows={4}
          />
        </Match>
        <Match when={!signedIn()}>
          <NoAccessState
            headingLevel={1}
            class="border-x-0 border-t-0"
            kicker="Inloggen nodig"
            title="Log in om je profiel te bekijken"
            description="Je profiel, fotoboek en recente activiteit horen bij je account. Log in om verder te gaan."
            action={
              <Link
                to="/auth/sign-in"
                class="inline-flex min-h-11 items-center bg-primary px-4 font-bold text-primary-content transition-colors hover:bg-brand-700 active:bg-brand-700"
              >
                Inloggen
              </Link>
            }
            secondaryAction={
              <Link
                to="/"
                class="inline-flex min-h-11 items-center border border-brand-300 bg-base-300 px-4 font-bold text-base-content transition-colors hover:border-primary hover:bg-primary hover:text-primary-content active:border-brand-700 active:bg-brand-700"
              >
                Terug naar het forum
              </Link>
            }
          />
        </Match>
        <Match when={profile.loading || activity.loading}>
          <Skeleton
            class="border-x-0 border-t-0"
            label="Profiel laden"
            rows={4}
          />
        </Match>
        <Match when={profile.error || activity.error}>
          <ErrorState
            headingLevel={1}
            class="border-x-0 border-t-0"
            title="Dat ging mis"
            description="We konden je profiel niet ophalen. Probeer het nog eens."
            action={
              <Button variant="primary" onClick={() => void retry()}>
                Opnieuw proberen
              </Button>
            }
          />
        </Match>
        <Match when={profile()}>
          {(loaded) => (
            <ProfileEditorSections profile={loaded()} activity={activity()} />
          )}
        </Match>
      </Switch>
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
  const [passwordDialogOpen, setPasswordDialogOpen] = createSignal(false);
  const [passwordSuccess, setPasswordSuccess] = createSignal<string | null>(
    null,
  );

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

        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button
            variant="surface"
            class="min-h-11"
            onClick={() => {
              editor.clearMessages();
              setPasswordSuccess(null);
              setPasswordDialogOpen(true);
            }}
          >
            Wachtwoord wijzigen
          </Button>
          <Button
            type="submit"
            form="profile-form"
            variant="primary"
            class="min-h-11 sm:ml-0"
            loading={editor.saving()}
            onClick={() => {
              setPasswordSuccess(null);
            }}
          >
            {editor.saving() ? "Profiel opslaan…" : "Profiel opslaan"}
          </Button>
        </div>
      </header>

      <ChangePasswordDialog
        open={passwordDialogOpen()}
        onClose={() => setPasswordDialogOpen(false)}
        onSuccess={() => {
          setPasswordDialogOpen(false);
          editor.clearMessages();
          setPasswordSuccess("Je wachtwoord is gewijzigd.");
        }}
      />

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
      <Show when={passwordSuccess()}>
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
