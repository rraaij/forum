/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/solid-router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  Match,
  onMount,
  Show,
  Suspense,
  Switch,
} from "solid-js";
import { HydrationScript } from "solid-js/web";
import "../styles.css";
import { CategoryManagerDialog } from "@/components/CategoryManagerDialog";
import type { SessionUser } from "@/lib/auth-client";
import { signOut, useSession } from "@/lib/auth-client";

type ThemeName = "light" | "dark";

const TOP_SECTIONS = [
  "frontpage",
  "weblog",
  "forum",
  "fotoboek",
  "zoeken",
  "dm",
];

export const Route = createRootRoute({
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <title>Forum</title>
        <HydrationScript />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [adminOpen, setAdminOpen] = createSignal(false);
  const session = useSession();
  const user = () => session().data?.user as SessionUser | undefined;
  const location = useLocation();
  const [theme, setTheme] = createSignal<ThemeName>("light");

  onMount(() => {
    const storedTheme = window.localStorage.getItem("forum-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  });

  createEffect(() => {
    if (typeof document === "undefined") return;
    const activeTheme = theme();
    document.documentElement.setAttribute("data-theme", activeTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("forum-theme", activeTheme);
    }
  });

  const isDarkTheme = createMemo(() => theme() === "dark");

  return (
    <div class="min-h-screen bg-base-300/30">
      <header class="sticky top-0 z-30 shadow-lg">
        <div class="bg-[#0b67a7] text-slate-100">
          <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div class="flex items-center gap-3">
              <Link
                to="/"
                class="rounded-md bg-[#075186] px-3 py-2 text-sm font-black uppercase tracking-wider text-white"
              >
                Forum
              </Link>
              <div class="hidden items-center gap-1 md:flex">
                <For each={TOP_SECTIONS}>
                  {(section) => (
                    <span
                      classList={{
                        "rounded-sm bg-[#075186] px-3 py-2 text-xs font-semibold text-white":
                          section === "forum" &&
                          !location().pathname.startsWith("/auth"),
                        "rounded-sm px-3 py-2 text-xs font-semibold text-slate-200":
                          !(
                            section === "forum" &&
                            !location().pathname.startsWith("/auth")
                          ),
                      }}
                    >
                      {section}
                    </span>
                  )}
                </For>
              </div>
            </div>

            <div class="hidden items-center gap-3 lg:flex">
              <select class="select select-xs w-40 border-white/20 bg-black/20 text-slate-100">
                <option>dit forum (SPT)</option>
                <option>alle forums</option>
              </select>
              <label class="input input-xs w-56 border-white/20 bg-black/20 text-slate-100">
                <span class="text-slate-300">zoek</span>
                <input
                  type="search"
                  placeholder="zoek in het forum"
                  aria-label="Search forum"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="bg-neutral text-neutral-content">
          <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
            <div class="text-xs font-medium">
              Je bent ingelogd als{" "}
              <Show when={user()} fallback={<span>gast</span>}>
                {(u) => <span class="font-bold text-info">{u().name}</span>}
              </Show>
              .
            </div>

            <div class="flex items-center gap-2">
              <label class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1">
                <span class="text-xs font-semibold uppercase tracking-wide">
                  <Switch fallback="Dark">
                    <Match when={!isDarkTheme()}>Light</Match>
                  </Switch>
                </span>
                <input
                  type="checkbox"
                  class="toggle toggle-sm"
                  checked={isDarkTheme()}
                  onInput={() => setTheme(isDarkTheme() ? "light" : "dark")}
                  aria-label="Toggle dark mode"
                />
              </label>

              <Show when={user()?.role === "admin"}>
                <button
                  class="btn btn-ghost btn-sm"
                  onClick={() => setAdminOpen(true)}
                  title="Manage categories"
                >
                  ⚙️ Manage
                </button>
              </Show>

              <Show
                when={user()}
                fallback={
                  <div class="flex items-center gap-1">
                    <Link
                      to="/auth/sign-in"
                      class="btn btn-ghost btn-xs text-neutral-content"
                    >
                      Sign In
                    </Link>
                    <Link to="/auth/sign-up" class="btn btn-info btn-xs">
                      Sign Up
                    </Link>
                  </div>
                }
              >
                {(u) => (
                  <div class="dropdown dropdown-end">
                    <button
                      tabindex="0"
                      class="btn btn-ghost btn-circle avatar placeholder"
                    >
                      <div class="bg-neutral-content/20 text-neutral-content w-8 rounded-full">
                        <span class="text-xs">
                          {u().name?.charAt(0).toUpperCase() ?? "?"}
                        </span>
                      </div>
                    </button>
                    <ul
                      tabindex="0"
                      class="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 text-base-content shadow"
                    >
                      <li class="menu-title">{u().name}</li>
                      <li>
                        <button onClick={() => signOut()}>Sign Out</button>
                      </li>
                    </ul>
                  </div>
                )}
              </Show>
            </div>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-7xl px-4 py-6">
        <Suspense>
          <Outlet />
        </Suspense>
      </main>

      <CategoryManagerDialog
        open={adminOpen()}
        onClose={() => setAdminOpen(false)}
      />
    </div>
  );
}
