import { Avatar, Button, EmptyState, NoAccessState, Skeleton } from "@forum/ui";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { createResource, createSignal, For, Show } from "solid-js";
import { RelativeTime } from "@/components/RelativeTime";
import { topicLinkProps } from "@/features/forum-read/topic-link";
import { createPageAccumulator } from "@/features/forum-read/use-page-accumulator";
import {
  fetchNotifications,
  markNotificationRead,
  type NotificationPage,
} from "@/features/notifications/api";
import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const session = useSession();
  const userId = () => session().data?.user.id;
  const [firstPage] = createResource(userId, () => fetchNotifications());

  return (
    <Show
      when={userId()}
      fallback={
        <NoAccessState
          headingLevel={1}
          class="my-8"
          title="Log in voor je meldingen"
          description="Daar bewaren we nieuwe reacties op topics die je volgt."
          action={
            <Link
              to="/auth/sign-in"
              class="inline-flex min-h-11 items-center bg-primary px-4 font-bold text-primary-content hover:bg-brand-700 active:bg-brand-700"
            >
              Inloggen
            </Link>
          }
        />
      }
    >
      <Show
        when={firstPage()}
        fallback={<Skeleton class="my-8" label="Meldingen laden" rows={4} />}
      >
        {(page) => <NotificationList firstPage={page()} />}
      </Show>
    </Show>
  );
}

function NotificationList(props: { firstPage: NotificationPage }) {
  const notifications = createPageAccumulator(
    () => props.firstPage,
    fetchNotifications,
  );
  const [loadError, setLoadError] = createSignal(false);

  const loadMore = async () => {
    setLoadError(false);
    try {
      await notifications.loadMore();
    } catch {
      setLoadError(true);
    }
  };

  const markRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      window.dispatchEvent(new Event("notifications-changed"));
    } catch {
      // Navigation remains useful if acknowledgement briefly fails.
    }
  };

  return (
    <section class="bg-base-100">
      <header class="border-b-2 border-base-content bg-base-200 px-4 py-6 sm:px-10">
        <p class="text-xs font-bold tracking-[0.08em] text-primary uppercase">
          Persoonlijk
        </p>
        <h1 class="mt-1 font-serif text-[34px] leading-tight font-semibold">
          Meldingen
        </h1>
        <p class="mt-2 max-w-[58ch] text-sm text-brand-700">
          Nieuwe reacties op topics waarop je bent geabonneerd.
        </p>
      </header>

      <Show
        when={notifications.items().length > 0}
        fallback={
          <EmptyState
            class="border-x-0 border-t-0 border-b-2 border-base-content"
            title="Nog geen meldingen"
            description="Rustig hier. Dat is soms ook gewoon lekker."
          />
        }
      >
        <ul aria-label="Meldingen">
          <For each={notifications.items()}>
            {(notification) => {
              const actorName =
                notification.actor.displayName ??
                notification.actor.name ??
                "Iemand";
              return (
                <li class="border-b border-brand-300">
                  <Link
                    {...topicLinkProps(notification.routeParams)}
                    search={{ post: notification.postId }}
                    hash={`post-${notification.postId}`}
                    class="group flex min-h-20 items-center gap-3 px-4 py-4 hover:bg-base-200 sm:px-10"
                    onClick={() => void markRead(notification.id)}
                  >
                    <Avatar
                      src={notification.actor.image}
                      name={actorName}
                      size="md"
                      alt=""
                    />
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm text-brand-800">
                        <strong class="font-extrabold text-base-content">
                          {actorName}
                        </strong>{" "}
                        reageerde in
                      </span>
                      <span class="block truncate font-bold group-hover:text-primary">
                        {notification.topic.title}
                      </span>
                    </span>
                    <RelativeTime
                      value={notification.createdAt}
                      class="shrink-0 text-[12.5px] text-brand-700"
                    />
                    <Show when={!notification.readAt}>
                      <span class="size-2 shrink-0 bg-primary">
                        <span class="sr-only">Ongelezen</span>
                      </span>
                    </Show>
                  </Link>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>

      <Show when={notifications.nextCursor()}>
        <div class="flex justify-center border-b-2 border-base-content py-4">
          <Button
            variant="surface"
            loading={notifications.loading()}
            onClick={() => void loadMore()}
          >
            Meer meldingen
          </Button>
        </div>
      </Show>
      <Show when={loadError()}>
        <p
          class="border-b border-error bg-error/10 px-4 py-3 text-sm text-error sm:px-10"
          role="alert"
        >
          Meer meldingen laden is niet gelukt. Probeer het nog eens.
        </p>
      </Show>
    </section>
  );
}
