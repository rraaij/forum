import { Avatar, Button, Tag } from "@forum/ui";
import { Link, useRouter } from "@tanstack/solid-router";
import { createSignal, For, onMount, Show } from "solid-js";
import {
  fetchTopicPage,
  type PostView,
  type TopicPage,
} from "@/features/forum-read/api";
import { createPageAccumulator } from "@/features/forum-read/use-page-accumulator";
import { useSession } from "@/lib/auth-client";
import { recordTopicView } from "./api";
import { PostList } from "./PostList";
import { ReplyComposer } from "./ReplyComposer";
import { getBrowserSessionId } from "./topic-view-session";

type TopicDetailPageProps = {
  page: () => TopicPage;
};

const numberFormatter = new Intl.NumberFormat("nl-NL");

const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "onbekend tijdstip";

export function TopicDetailPage(props: TopicDetailPageProps) {
  const router = useRouter();
  const session = useSession();
  const user = () => session().data?.user;

  const topic = () => props.page().topic;
  const openingPost = () => props.page().openingPost;
  const breadcrumbs = () => props.page().breadcrumbs;
  const rootSlug = () => breadcrumbs()[0]?.slug ?? "";
  const boardName = () => breadcrumbs().at(-1)?.name ?? "het forum";
  const openingAuthorName = () =>
    openingPost().author.displayName ?? openingPost().author.name ?? "Onbekend";

  const [quotedPost, setQuotedPost] = createSignal<PostView | null>(null);
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
  });

  const canReply = () => Boolean(user()) && !topic().isLocked;

  const reload = async () => {
    await router.invalidate();
  };

  const handleQuote = (post: PostView) => {
    setQuotedPost(post);
    focusComposer?.();
  };

  return (
    <div class="-mx-4 -my-2 bg-base-200 text-base-content">
      <nav
        class="breadcrumbs border-b-2 border-base-content bg-base-300 px-6 py-2 text-[13.5px] sm:px-10"
        aria-label="Kruimelpad"
      >
        <ul>
          <li>
            <Link to="/">Forum</Link>
          </li>
          <For each={breadcrumbs()}>
            {(crumb) => (
              <li>
                <Show
                  when={crumb.isRoot}
                  fallback={
                    <Link
                      to="/categories/$categorySlug/subcategories/$boardId"
                      params={{
                        categorySlug: rootSlug(),
                        boardId: crumb.boardId,
                      }}
                    >
                      {crumb.name}
                    </Link>
                  }
                >
                  <Link
                    to="/categories/$categorySlug"
                    params={{ categorySlug: crumb.slug }}
                  >
                    {crumb.name}
                  </Link>
                </Show>
              </li>
            )}
          </For>
          <li>{topic().title}</li>
        </ul>
      </nav>

      <header class="border-b-2 border-base-content px-6 py-7 sm:px-10">
        <div class="flex flex-wrap items-center gap-2 text-[12.5px] text-brand-700">
          <Show when={topic().isPinned}>
            <Tag variant="secondary">Vastgepind</Tag>
          </Show>
          <span>
            in {boardName()} · {numberFormatter.format(topic().replyCount)}{" "}
            {topic().replyCount === 1 ? "reactie" : "reacties"} ·{" "}
            {numberFormatter.format(topic().viewCount)} keer bekeken
          </span>
        </div>

        <h1 class="mt-2 max-w-[30ch] text-[34px] leading-[1.08] font-semibold tracking-[-0.01em] text-wrap-balance">
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
              opende dit topic op {formatDateTime(openingPost().createdAt)}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button variant="surface">Abonneer</Button>
            <Show when={canReply()}>
              <Button variant="primary" onClick={() => focusComposer?.()}>
                Reageer
              </Button>
            </Show>
          </div>
        </div>
      </header>

      <PostList
        openingPost={openingPost()}
        replies={replies.items()}
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
        <div class="border-t-2 border-base-content bg-flame-100 px-6 py-4 text-sm font-semibold text-flame-800 sm:px-10">
          Dit topic is gesloten. Je kunt niet meer reageren.
        </div>
      </Show>
    </div>
  );
}
