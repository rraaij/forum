import { Avatar, Button, Tag } from "@forum/ui";
import { useRouter } from "@tanstack/solid-router";
import { createResource, createSignal, onMount, Show } from "solid-js";
import { RelativeTime } from "@/components/RelativeTime";
import {
  fetchTopicPage,
  type PostView,
  type TopicPage,
} from "@/features/forum-read/api";
import { createPageAccumulator } from "@/features/forum-read/use-page-accumulator";
import {
  fetchSubscription,
  setSubscription,
} from "@/features/notifications/api";
import { useSession } from "@/lib/auth-client";
import { userFacingError } from "@/lib/user-facing-error";
import { recordTopicView } from "./api";
import { PostList } from "./PostList";
import { ReplyComposer } from "./ReplyComposer";
import { getBrowserSessionId } from "./topic-view-session";

type TopicDetailPageProps = {
  page: () => TopicPage;
};

const numberFormatter = new Intl.NumberFormat("nl-NL");

export function TopicDetailPage(props: TopicDetailPageProps) {
  const router = useRouter();
  const session = useSession();
  const user = () => session().data?.user;

  const topic = () => props.page().topic;
  const openingPost = () => props.page().openingPost;
  const breadcrumbs = () => props.page().breadcrumbs;
  const boardName = () => breadcrumbs().at(-1)?.name ?? "het forum";
  const openingAuthorName = () =>
    openingPost().author.displayName ?? openingPost().author.name ?? "Onbekend";

  const [quotedPost, setQuotedPost] = createSignal<PostView | null>(null);
  const [subscriptionBusy, setSubscriptionBusy] = createSignal(false);
  const [subscriptionMessage, setSubscriptionMessage] = createSignal<
    string | null
  >(null);
  const [subscription, { mutate: mutateSubscription }] = createResource(
    () => (user() ? topic().id : null),
    fetchSubscription,
  );
  let focusComposer: (() => void) | undefined;

  const replies = createPageAccumulator(
    () => props.page().replies,
    (cursor) =>
      fetchTopicPage(topic().slug, cursor).then((page) => page.replies),
  );

  /*
   * Explicit, deduplicated view command AFTER a successful client render
   * (plan section 4.4). Reload/invalidation reuses the same browser-session
   * UUID, so it never counts twice; SSR never runs this.
   */
  onMount(() => {
    void recordTopicView(topic().id, getBrowserSessionId()).catch(() => {
      // View recording is best-effort; the page must not fail because of it.
    });
    requestAnimationFrame(() => {
      const target = window.location.hash.slice(1);
      if (target) document.getElementById(target)?.scrollIntoView();
    });
  });

  const canReply = () => Boolean(user()) && !topic().isLocked;

  const reload = async () => {
    await router.invalidate();
  };

  const handleQuote = (post: PostView) => {
    setQuotedPost(post);
    focusComposer?.();
  };

  const toggleSubscription = async () => {
    const next = !subscription();
    setSubscriptionBusy(true);
    setSubscriptionMessage(null);
    try {
      const subscribed = await setSubscription(topic().id, next);
      mutateSubscription(subscribed);
      setSubscriptionMessage(
        subscribed
          ? "Je krijgt hier meldingen bij nieuwe reacties."
          : "Je ontvangt geen nieuwe meldingen voor dit topic.",
      );
    } catch (error) {
      setSubscriptionMessage(
        userFacingError(error, "Abonneren is mislukt. Probeer het nog eens."),
      );
    } finally {
      setSubscriptionBusy(false);
    }
  };

  return (
    <div class="bg-base-200 text-base-content">
      <header class="border-b-2 border-base-content px-4 py-5 sm:px-10 sm:py-7">
        <div class="flex flex-wrap items-center gap-2 text-[12.5px] text-brand-700">
          <Show when={topic().isPinned}>
            <Tag variant="secondary">Vastgepind</Tag>
          </Show>
          <span class="min-w-0 [overflow-wrap:anywhere]">
            in {boardName()} · {numberFormatter.format(topic().replyCount)}{" "}
            {topic().replyCount === 1 ? "reactie" : "reacties"} ·{" "}
            {numberFormatter.format(topic().viewCount)} keer bekeken
          </span>
        </div>

        <h1 class="mt-2 min-w-0 max-w-[30ch] text-[26px] leading-[1.08] font-semibold tracking-[-0.01em] text-wrap-balance [overflow-wrap:anywhere] sm:text-[34px]">
          {topic().title}
        </h1>

        <div class="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div class="flex items-center gap-3 text-[13.5px] text-brand-800">
            <Avatar
              src={openingPost().author.image}
              name={openingAuthorName()}
              size="sm"
              alt=""
            />
            <p>
              <strong class="font-extrabold text-base-content">
                {openingAuthorName()}
              </strong>{" "}
              opende dit topic <RelativeTime value={openingPost().createdAt} />
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Show when={user()}>
              <Button
                variant="surface"
                class="sm:min-h-9"
                aria-pressed={subscription() ?? false}
                loading={subscription.loading || subscriptionBusy()}
                onClick={() => void toggleSubscription()}
              >
                {subscription() ? "Geabonneerd" : "Abonneer"}
              </Button>
            </Show>
            <Show when={canReply()}>
              <Button
                variant="primary"
                class="sm:min-h-9"
                onClick={() => focusComposer?.()}
              >
                Reageer
              </Button>
            </Show>
          </div>
        </div>
        <Show when={subscriptionMessage()}>
          {(message) => (
            <p class="mt-3 text-right text-xs text-brand-700" role="status">
              {message()}
            </p>
          )}
        </Show>
      </header>

      <PostList
        openingPost={openingPost()}
        replies={replies.items()}
        replyStartIndex={props.page().replyStartIndex}
        onQuote={handleQuote}
        onChanged={reload}
        canReply={canReply()}
        nextCursor={replies.nextCursor()}
        loadingMore={replies.loading()}
        onLoadMore={replies.loadMore}
      />

      <Show when={canReply()}>
        <ReplyComposer
          topicId={topic().id}
          userName={user()?.name ?? "jij"}
          userImage={user()?.image}
          quotedPost={quotedPost()}
          onRemoveQuote={() => setQuotedPost(null)}
          onPosted={reload}
          registerFocus={(focus) => {
            focusComposer = focus;
          }}
        />
      </Show>

      <Show when={topic().isLocked}>
        <div class="bg-base-300 px-6 py-4 text-sm font-semibold text-brand-800 sm:px-10">
          Dit topic is gesloten. Je kunt niet meer reageren.
        </div>
      </Show>
    </div>
  );
}
