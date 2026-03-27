import { A, Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Suspense,
  Switch,
} from "solid-js";
import "./styles.css";
import { CategoryManagerDialog } from "@/components/CategoryManagerDialog";
import type { SessionUser } from "@/lib/auth-client";
import { signOut, useSession } from "@/lib/auth-client";

type ThemeName = "light" | "dark";

// These top-level sections mirror the vintage forum style from the reference image.
const TOP_SECTIONS = [
  "frontpage",
  "weblog",
  "forum",
  "fotoboek",
  "zoeken",
  "dm",
];

export default function App() {
  const [adminOpen, setAdminOpen] = createSignal(false);

  return (
    <Router
      root={(props) => {
        // We keep auth data in the root shell so every page can render account controls.
        const session = useSession();
        const user = () => session().data?.user as SessionUser | undefined;
        const location = useLocation();

        // Theme state is intentionally simple: only light and dark, driven by DaisyUI.
        const [theme, setTheme] = createSignal<ThemeName>("light");

        // Read theme preference once on mount to avoid touching window/localStorage on SSR.
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

        // Persist the selected theme and apply it to the root HTML element for DaisyUI.
        createEffect(() => {
          if (typeof document === "undefined") {
            return;
          }

          const activeTheme = theme();
          document.documentElement.setAttribute("data-theme", activeTheme);

          if (typeof window !== "undefined") {
            window.localStorage.setItem("forum-theme", activeTheme);
          }
        });

        // This memo is used by both UI labels and checked state of the switch.
        const isDarkTheme = createMemo(() => theme() === "dark");

        return (
          <div class="min-h-screen bg-base-300/30">
            <header class="sticky top-0 z-30 shadow-lg">
              <div class="bg-[#0b67a7] text-slate-100">
                <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
                  <div class="flex items-center gap-3">
                    <A
                      href="/"
                      class="rounded-md bg-[#075186] px-3 py-2 text-sm font-black uppercase tracking-wider text-white"
                    >
                      Forum
                    </A>
                    <div class="hidden items-center gap-1 md:flex">
                      <For each={TOP_SECTIONS}>
                        {(section) => (
                          <span
                            classList={{
                              "rounded-sm bg-[#075186] px-3 py-2 text-xs font-semibold text-white":
                                section === "forum" &&
                                !location.pathname.startsWith("/auth"),
                              "rounded-sm px-3 py-2 text-xs font-semibold text-slate-200":
                                !(
                                  section === "forum" &&
                                  !location.pathname.startsWith("/auth")
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
                      {(u) => (
                        <span class="font-bold text-info">{u().name}</span>
                      )}
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
                        onInput={() =>
                          setTheme(isDarkTheme() ? "light" : "dark")
                        }
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
                          <A
                            href="/auth/sign-in"
                            class="btn btn-ghost btn-xs text-neutral-content"
                          >
                            Sign In
                          </A>
                          <A href="/auth/sign-up" class="btn btn-info btn-xs">
                            Sign Up
                          </A>
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
                              <button onClick={() => signOut()}>
                                Sign Out
                              </button>
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
              <Suspense>{props.children}</Suspense>
            </main>
            <CategoryManagerDialog
              open={adminOpen()}
              onClose={() => setAdminOpen(false)}
            />
          </div>
        );
      }}
    >
      <FileRoutes />
    </Router>
  );
}
