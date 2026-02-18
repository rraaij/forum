import { A, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Show, Suspense } from "solid-js";
import "./styles.css";
import { signOut, useSession } from "@/lib/auth-client";

export default function App() {
  return (
    <Router
      root={(props) => {
        const session = useSession();
        const user = () => session().data?.user;

        return (
          <div class="min-h-screen bg-base-200">
            <div class="navbar bg-base-100 shadow-sm">
              <div class="flex-1">
                <A href="/" class="btn btn-ghost text-xl">
                  Forum
                </A>
              </div>
              <div class="flex-none gap-2">
                <Show
                  when={user()}
                  fallback={
                    <div class="flex gap-2">
                      <A href="/auth/sign-in" class="btn btn-ghost btn-sm">
                        Sign In
                      </A>
                      <A href="/auth/sign-up" class="btn btn-primary btn-sm">
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
                        <div class="bg-neutral text-neutral-content w-8 rounded-full">
                          <span class="text-xs">
                            {u().name?.charAt(0).toUpperCase() ?? "?"}
                          </span>
                        </div>
                      </button>
                      <ul
                        tabindex="0"
                        class="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow"
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
            <main class="container mx-auto px-4 py-6">
              <Suspense>{props.children}</Suspense>
            </main>
          </div>
        );
      }}
    >
      <FileRoutes />
    </Router>
  );
}
