import { Button, ErrorState, NoAccessState, Skeleton } from "@forum/ui";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/solid-router";
import { createSignal, Match, onMount, Switch } from "solid-js";
import { BoardManagerPage } from "@/features/board-management/BoardManagerPage";
import { fetchForumIndex } from "@/features/forum-read/api";
import { getSession, signOut } from "@/lib/auth-client";

type AccessState = "checking" | "allowed" | "denied" | "error";

export const Route = createFileRoute("/admin/boards")({
  /*
   * Client-side navigation is rejected before the route renders. During SSR
   * the auth client cannot see the incoming cookie, so direct requests continue
   * to the component's browser check and its designed no-access state. Every
   * admin endpoint independently enforces the role; that remains the security
   * boundary rather than this UX guard.
   */
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const session = await getSession();
    const role = (session?.data?.user as { role?: string } | undefined)?.role;
    if (role !== "admin") throw redirect({ to: "/" });
  },
  loader: () => fetchForumIndex(),
  component: AdminBoardsRoute,
});

function AdminBoardsRoute() {
  const index = Route.useLoaderData();
  const navigate = useNavigate();
  const [access, setAccess] = createSignal<AccessState>("checking");

  const checkAccess = async () => {
    setAccess("checking");
    try {
      const session = await getSession();
      const role = (session?.data?.user as { role?: string } | undefined)?.role;
      setAccess(role === "admin" ? "allowed" : "denied");
    } catch {
      setAccess("error");
    }
  };

  // The one-shot read runs only in the browser, where it carries the Better
  // Auth cookie. SSR renders the skeleton and never exposes admin controls.
  onMount(() => void checkAccess());

  return (
    <Switch>
      <Match when={access() === "checking"}>
        <Skeleton class="my-8" label="Toegang controleren" rows={4} />
      </Match>
      <Match when={access() === "error"}>
        <ErrorState
          headingLevel={1}
          class="my-8"
          title="Dat ging mis"
          description="We konden je toegang niet controleren. Probeer het nog eens."
          action={
            <Button variant="primary" onClick={() => void checkAccess()}>
              Opnieuw proberen
            </Button>
          }
        />
      </Match>
      <Match when={access() === "denied"}>
        <NoAccessState
          headingLevel={1}
          class="my-8"
          title="Dit is niet voor jou bedoeld"
          description="Beheerpagina's zijn alleen voor beheerders. Denk je dat dit onterecht is? Gebruik dan een ander account."
          action={
            <Link
              to="/"
              class="inline-flex min-h-11 items-center bg-primary px-4 font-bold text-primary-content transition-colors hover:bg-brand-700 active:bg-brand-700"
            >
              Terug naar het forum
            </Link>
          }
          secondaryAction={
            <Button
              variant="surface"
              onClick={async () => {
                await signOut();
                await navigate({ to: "/auth/sign-in" });
              }}
            >
              Andere account gebruiken
            </Button>
          }
        />
      </Match>
      <Match when={access() === "allowed"}>
        <BoardManagerPage index={index} />
      </Match>
    </Switch>
  );
}
