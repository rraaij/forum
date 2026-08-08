import { createFileRoute, redirect, useNavigate } from "@tanstack/solid-router";
import { createSignal, onMount, Show } from "solid-js";
import { BoardManagerPage } from "@/features/board-management/BoardManagerPage";
import { fetchForumIndex } from "@/features/forum-read/api";
import { getSession } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/boards")({
  /*
   * Navigation guard for UX only; every /api/admin/boards endpoint keeps its
   * own server-side guard, which is the security seam (plan 7.1).
   *
   * This covers CLIENT-side navigation (the header's Manage link), where the
   * auth client can read the session. During SSR it cannot see the request
   * cookie and would bounce a legitimate admin, so the component below
   * re-checks once the browser session resolves — that path covers direct
   * navigation and refreshes.
   */
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const session = await getSession();
    const role = (session?.data?.user as { role?: string } | undefined)?.role;
    if (role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  loader: () => fetchForumIndex(),
  component: AdminBoardsRoute,
});

function AdminBoardsRoute() {
  const index = Route.useLoaderData();
  const navigate = useNavigate();
  const [allowed, setAllowed] = createSignal(false);

  /*
   * One awaited session read, deliberately not the reactive useSession store:
   * on a server-rendered load that store can stay pending indefinitely, which
   * would leave this page stuck instead of deciding. This runs client-side
   * only, so the request carries the session cookie.
   */
  onMount(async () => {
    const session = await getSession();
    const role = (session?.data?.user as { role?: string } | undefined)?.role;
    if (role === "admin") {
      setAllowed(true);
      return;
    }
    await navigate({ to: "/", replace: true });
  });

  // Never render management controls before the role is confirmed.
  return (
    <Show
      when={allowed()}
      fallback={<p class="text-sm text-brand-700">Toegang controleren…</p>}
    >
      <BoardManagerPage index={index} />
    </Show>
  );
}
