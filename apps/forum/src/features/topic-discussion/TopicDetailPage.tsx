import { Link, useRouter } from "@tanstack/solid-router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import PageHeader from "@/components/PageHeader";
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

const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown time";

export function TopicDetailPage(props: TopicDetailPageProps) {
  const router = useRouter();
  const session = useSession();
  const user = () => session().data?.user;

  const topic = () => props.page().topic;
  const openingPost = () => props.page().openingPost;
  const breadcrumbs = () => props.page().breadcrumbs;
  const rootSlug = () => breadcrumbs()[0]?.slug ?? "";

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

  const openingPostText = createMemo(() => {
    const post = openingPost();
    if (post.isDeleted) return "This opening post has been deleted.";
    return post.content;
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
    <div class="flex h-[calc(100dvh-7.5rem)] min-h-0 flex-col gap-2 overflow-hidden">
      <div class="breadcrumbs shrink-0 text-sm">
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
      </div>

      <div class="shrink-0">
        <PageHeader
          forumCode={breadcrumbs().at(-1)?.slug.toUpperCase() ?? ""}
          title={topic().title}
          description={openingPostText()}
          author={{
            name: openingPost().author.displayName ?? openingPost().author.name,
            image: openingPost().author.image,
            createdAt: formatDateTime(openingPost().createdAt),
          }}
          stats={[
            { label: "views", value: String(topic().viewCount) },
            { label: "replies", value: String(topic().replyCount) },
          ]}
        />
      </div>

      <PostList
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
          quotedPost={quotedPost()}
          onRemoveQuote={() => setQuotedPost(null)}
          onPosted={reload}
          registerFocus={(focus) => {
            focusComposer = focus;
          }}
        />
      </Show>

      <Show when={topic().isLocked}>
        <div class="alert sticky bottom-0 z-20 shrink-0 border border-warning/40 bg-warning/10 text-warning-content shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <span>This topic is locked. No new replies can be posted.</span>
        </div>
      </Show>
    </div>
  );
}
