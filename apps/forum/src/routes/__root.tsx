/// <reference types="vite/client" />
import {
  AppShell,
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@forum/ui";
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useMatches,
  useRouter,
} from "@tanstack/solid-router";
import { Menu } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
  Suspense,
} from "solid-js";
import { HydrationScript } from "solid-js/web";
import "../styles.css";
import { ForumBreadcrumbs } from "@/components/ForumBreadcrumbs";
import { fetchUnreadCount } from "@/features/notifications/api";
import type { SessionUser } from "@/lib/auth-client";
import { signOut, useSession } from "@/lib/auth-client";
import { profileAvatarPreview } from "@/lib/profile-avatar";

const FUTURE_APPS = ["nieuws", "fotoboek", "dm"] as const;

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
  shellComponent: RootDocument,
});

function RootNotFoundComponent() {
  return (
    <EmptyState
      class="my-8"
      kicker="404"
      headingLevel={1}
      title="Deze pagina bestaat niet"
      description="De pagina is misschien verplaatst, verwijderd, of heeft nooit bestaan."
      action={
        <Link
          to="/"
          class="inline-flex min-h-11 items-center bg-primary px-4 font-bold text-primary-content transition-colors hover:bg-brand-700 active:bg-brand-700"
        >
          Terug naar het forum
        </Link>
      }
    />
  );
}

function getErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("DATABASE_UNAVAILABLE")
    ? "DATABASE_UNAVAILABLE"
    : "ONBEKENDE_FOUT";
}

function RootErrorComponent({ error }: { error: unknown }) {
  const router = useRouter();

  return (
    <main class="min-h-screen bg-base-200 px-4 py-10">
      <ErrorState
        headingLevel={1}
        class="mx-auto max-w-3xl border-2 border-base-content"
        title="Dat ging mis"
        description="We konden deze pagina niet ophalen. Meestal is het tijdelijk, dus probeer het gerust nog eens."
        code={`foutcode ${getErrorCode(error)}`}
        action={
          <Button variant="primary" onClick={() => void router.invalidate()}>
            Opnieuw proberen
          </Button>
        }
      />
    </main>
  );
}

function RootDocument({ children }: { children: JSX.Element }) {
  return (
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Newsreader:opsz,wght@6..72,400..700&display=swap"
        />
        <title>Forum</title>
        <HydrationScript />
        <HeadContent />
      </head>
      <body>
        <a
          href="#main-content"
          class="sr-only fixed top-2 left-2 z-50 bg-primary px-4 py-3 font-bold text-primary-content active:bg-brand-700 focus:not-sr-only"
        >
          Naar hoofdinhoud
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const session = useSession();
  const matches = useMatches();
  const user = () => session().data?.user as SessionUser | undefined;
  const [unreadCount, setUnreadCount] = createSignal(0);
  let accountMenu: HTMLDetailsElement | undefined;
  let mobileAppMenu: HTMLDetailsElement | undefined;
  let previousRouteId: string | undefined;

  const closeAccountMenu = () => accountMenu?.removeAttribute("open");
  const closeMobileAppMenu = () => mobileAppMenu?.removeAttribute("open");

  const refreshUnreadCount = async () => {
    if (!user()) {
      setUnreadCount(0);
      return;
    }
    try {
      setUnreadCount(await fetchUnreadCount());
    } catch {
      // A badge is supplementary; shell navigation must remain available.
    }
  };

  createEffect(() => {
    if (user()?.id) void refreshUnreadCount();
    else setUnreadCount(0);
  });

  createEffect(() => {
    const routeId = matches().at(-1)?.routeId;
    if (previousRouteId && routeId !== previousRouteId) {
      previousRouteId = routeId;
      // Hash navigation owns its own target. Ordinary SPA navigation moves
      // focus to the main landmark so the new page is announced.
      if (!window.location.hash) {
        requestAnimationFrame(() =>
          document.getElementById("main-content")?.focus(),
        );
      }
      return;
    }
    previousRouteId = routeId;
  });

  onMount(() => {
    const interval = window.setInterval(
      () => void refreshUnreadCount(),
      60_000,
    );
    const refresh = () => void refreshUnreadCount();
    window.addEventListener("notifications-changed", refresh);
    onCleanup(() => {
      window.clearInterval(interval);
      window.removeEventListener("notifications-changed", refresh);
    });
  });

  // Exact route IDs discriminate the typed loader-data union. Breadcrumbs are
  // already in the SSR payload, so the shared shell needs no extra request or
  // client-only registration step.
  const breadcrumbTrail = createMemo(() => {
    for (const match of matches()) {
      switch (match.routeId) {
        case "/categories/$categorySlug/":
        case "/categories/$categorySlug/subcategories/$boardId/":
          if (!match.loaderData) return undefined;
          return { breadcrumbs: match.loaderData.breadcrumbs };
        case "/categories/$categorySlug/topics/$topicSlug/":
        case "/categories/$categorySlug/subcategories/$boardId/topics/$topicSlug/":
          if (!match.loaderData) return undefined;
          return {
            breadcrumbs: match.loaderData.breadcrumbs,
            currentTitle: match.loaderData.topic.title,
          };
      }
    }
    return undefined;
  });
  // Auth posters start directly below the app bar, while the search route
  // already owns the full search form. A second-row search link is redundant
  // in both contexts and adds empty chrome without navigation value.
  const suppressSecondarySearch = createMemo(() =>
    matches().some(
      (match) =>
        match.routeId.startsWith("/auth/") || match.routeId === "/search",
    ),
  );

  return (
    <AppShell
      class="min-h-screen bg-base-200"
      brand={
        <Link
          to="/"
          aria-label="marijn.nl forum"
          class="inline-flex min-h-11 items-center"
        >
          marijn.nl
        </Link>
      }
      navigation={
        <>
          <Link to="/" aria-current="true">
            forum
          </Link>
          <For each={FUTURE_APPS}>
            {(app) => (
              <span
                aria-disabled="true"
                class="flex min-h-11 items-center px-[14px] text-[13.5px] text-ink-300"
                title={`${app} is nog niet beschikbaar`}
              >
                {app}
              </span>
            )}
          </For>
        </>
      }
      unreadBadge={
        <Show when={unreadCount() > 0}>
          <Link
            to="/notifications"
            class="inline-flex min-h-11 min-w-11 items-center justify-center bg-secondary px-2 text-[11.5px] font-extrabold text-secondary-content"
            aria-label={`${unreadCount()} ongelezen meldingen`}
          >
            {unreadCount()}
          </Link>
        </Show>
      }
      account={
        <Show
          when={user()}
          fallback={
            <div class="flex items-center gap-1">
              <Link
                to="/auth/sign-in"
                class="hidden min-h-11 items-center px-2 font-medium text-brand-400 hover:text-neutral-content sm:flex"
              >
                inloggen
              </Link>
              <Link
                to="/auth/sign-up"
                class="inline-flex min-h-11 items-center bg-primary px-3 font-bold text-primary-content hover:bg-brand-700 active:bg-brand-700"
              >
                Aanmelden
              </Link>
            </div>
          }
        >
          {(currentUser) => (
            <div class="flex items-center gap-2">
              <span class="hidden max-w-48 truncate text-ink-200 md:inline">
                hoi, {currentUser().name}
              </span>
              <details
                ref={(element) => {
                  accountMenu = element;
                }}
                class="relative"
              >
                <summary
                  class="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center transition-colors hover:bg-ink-700"
                  aria-label="Accountmenu"
                >
                  <Avatar
                    src={
                      profileAvatarPreview() === undefined
                        ? currentUser().image
                        : profileAvatarPreview()
                    }
                    name={currentUser().name}
                    size="shell"
                    alt=""
                  />
                </summary>
                <ul class="absolute top-full right-0 z-30 w-52 border-2 border-base-content bg-base-100 text-base-content">
                  <li class="border-b border-brand-300 px-4 py-3 text-xs font-bold text-brand-700">
                    <span class="block truncate">{currentUser().name}</span>
                  </li>
                  <li>
                    <Link
                      to="/profile"
                      class="flex min-h-11 items-center px-4 hover:bg-base-300 hover:text-primary"
                      onClick={closeAccountMenu}
                    >
                      Profiel
                    </Link>
                  </li>
                  <Show when={currentUser().role === "admin"}>
                    <li>
                      <Link
                        to="/admin/boards"
                        class="flex min-h-11 items-center border-t border-brand-300 px-4 hover:bg-base-300 hover:text-primary"
                        onClick={closeAccountMenu}
                      >
                        Forums beheren
                      </Link>
                    </li>
                  </Show>
                  <li>
                    <button
                      type="button"
                      class="flex min-h-11 w-full items-center border-t border-brand-300 px-4 text-left hover:bg-base-300 hover:text-primary"
                      onClick={() => {
                        closeAccountMenu();
                        void signOut();
                      }}
                    >
                      Uitloggen
                    </button>
                  </li>
                </ul>
              </details>
            </div>
          )}
        </Show>
      }
      mobileMenu={
        <details
          ref={(element) => {
            mobileAppMenu = element;
          }}
          class="relative"
        >
          <summary
            class="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center text-neutral-content transition-colors hover:bg-ink-700"
            aria-label="Appmenu"
          >
            <Menu aria-hidden="true" size={21} strokeWidth={2} />
          </summary>
          <div class="absolute top-full right-0 z-30 w-48 border-2 border-base-content bg-neutral">
            <nav aria-label="Apps op mobiel">
              <Link
                to="/"
                aria-current="true"
                class="flex min-h-11 items-center border-b border-ink-600 px-4 font-bold text-flame-400"
                onClick={closeMobileAppMenu}
              >
                forum
              </Link>
              <For each={FUTURE_APPS}>
                {(app) => (
                  <span
                    aria-disabled="true"
                    class="flex min-h-11 items-center border-b border-ink-600 px-4 text-ink-300"
                  >
                    {app}
                  </span>
                )}
              </For>
            </nav>
            <nav aria-label="Forum op mobiel">
              <Link
                to="/search"
                class="flex min-h-11 items-center px-4 font-bold text-ink-200 hover:text-brand-400"
                onClick={closeMobileAppMenu}
              >
                Zoeken
              </Link>
            </nav>
          </div>
        </details>
      }
      navigationLabel="Apps"
      secondary={(() => {
        const trail = breadcrumbTrail();
        return trail ? (
          <ForumBreadcrumbs
            breadcrumbs={trail.breadcrumbs}
            currentTitle={trail.currentTitle}
          />
        ) : undefined;
      })()}
      secondaryAction={
        suppressSecondarySearch() ? undefined : (
          <Link to="/search" activeOptions={{ exact: true }}>
            zoeken
          </Link>
        )
      }
      secondaryOnMobile={Boolean(breadcrumbTrail())}
      secondaryLabel={breadcrumbTrail() ? "Kruimelpad" : "Forumnavigatie"}
    >
      <main id="main-content" tabindex="-1" class="w-full">
        <Suspense
          fallback={
            <Skeleton class="m-4 sm:m-8" label="Pagina laden" rows={4} />
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </AppShell>
  );
}
