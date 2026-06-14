import { Avatar } from "@forum/ui";
import { Link, useRouter } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show } from "solid-js";
import PageHeader from "@/components/PageHeader";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import type { TopicDetail } from "@/types/forum";

type TopicDetailPageProps = {
  topic: TopicDetail;
  categorySlug: string;
  subcategorySlug?: string;
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

export default function TopicDetailPage(props: TopicDetailPageProps) {
  const router = useRouter();
  const session = useSession();
  const user = () => session().data?.user;

  const [replyContent, setReplyContent] = createSignal("");
  const [replying, setReplying] = createSignal(false);
  const [replyError, setReplyError] = createSignal<string | null>(null);

  // A topic's first post is the opening message; every later post is a reply.
  const replyCount = createMemo(() => Math.max(0, props.topic.postCount - 1));

  const handleReply = async (event: SubmitEvent) => {
    event.preventDefault();

    const content = replyContent().trim();
    if (!content) {
      setReplyError("Write a reply before posting.");
      return;
    }

    setReplying(true);
    setReplyError(null);

    try {
      /*
       * Send the mutation from the browser so apiFetch can include the active
       * Better Auth cookie. A server function starts a separate request and
       * does not automatically forward that cookie to the API, which caused
       * authenticated-looking submissions to fail with a hidden 401 response.
       */
      await apiFetch<{ id: string }>("/posts", {
        method: "POST",
        body: JSON.stringify({
          topicId: props.topic.id,
          content,
        }),
      });
      setReplyContent("");

      // Reload the active route so the newly written post appears immediately.
      await router.invalidate();
    } catch (submissionError) {
      // Keep the user's draft intact and explain why the reply was not posted.
      setReplyError(
        submissionError instanceof Error
          ? submissionError.message
          : "The reply could not be posted.",
      );
    } finally {
      setReplying(false);
    }
  };

  return (
    /*
     * The application header occupies 6.5rem and the root <main> contributes
     * one rem of vertical padding. Constraining the topic workspace to the
     * remaining dynamic viewport height lets the post stream scroll without
     * moving the reply editor off screen.
     */
    <div class="flex h-[calc(100dvh-7.5rem)] min-h-0 flex-col gap-2 overflow-hidden">
      <div class="breadcrumbs shrink-0 text-sm">
        <ul>
          <li>
            <Link to="/">Forum</Link>
          </li>
          <li>
            <Link to="/$category" params={{ category: props.categorySlug }}>
              {props.categorySlug}
            </Link>
          </li>
          {/*
           * Category topics skip the subcategory crumb, while subcategory
           * topics link back to their immediate board.
           */}
          <Show when={props.subcategorySlug}>
            {(subcategorySlug) => (
              <li>
                <Link
                  to="/$category/$sub"
                  params={{
                    category: props.categorySlug,
                    sub: subcategorySlug(),
                  }}
                >
                  {subcategorySlug()}
                </Link>
              </li>
            )}
          </Show>
          <li>{props.topic.title}</li>
        </ul>
      </div>

      {/* The topic identity remains visible while readers move through posts. */}
      <div class="shrink-0">
        <PageHeader
          forumCode={
            props.subcategorySlug?.toUpperCase() ??
            props.categorySlug.toUpperCase()
          }
          title={props.topic.title}
          description="Read every response in this topic, react to key posts, and add your own contribution below."
          stats={[
            { label: "started", value: formatDateTime(props.topic.createdAt) },
            { label: "views", value: String(props.topic.viewCount) },
            { label: "replies", value: String(replyCount()) },
          ]}
          tags={[
            props.categorySlug.toUpperCase(),
            ...(props.subcategorySlug
              ? [props.subcategorySlug.toUpperCase()]
              : []),
            props.topic.isPinned ? "PINNED" : "DISCUSSION",
            props.topic.isLocked ? "LOCKED" : "OPEN",
          ]}
        />
      </div>

      {/*
       * This is the only growing region in the topic workspace. `min-h-0` is
       * required for a flex child to shrink below its content height, allowing
       * overflow-y-auto to create the requested independent post scrollbar.
       */}
      <section class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        <For each={props.topic.posts}>
          {(post, index) => (
            <article class="overflow-hidden rounded-lg border border-base-content/15 bg-base-100 shadow-sm">
              <div class="grid md:grid-cols-[220px_1fr]">
                <aside class="border-b border-base-content/10 bg-base-200/55 p-4 md:border-b-0 md:border-r">
                  <div class="flex items-center gap-3">
                    <Avatar
                      src={post.authorImage}
                      name={post.authorName}
                      size="md"
                    />
                    <div>
                      <p class="font-bold leading-tight">
                        {post.authorName ?? "Unknown"}
                      </p>
                      <p class="text-xs text-base-content/60">
                        User #{post.authorId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </aside>

                <div class="p-4 md:p-6">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    <span>{formatDateTime(post.createdAt)}</span>
                    <div class="flex items-center gap-3">
                      <span>#{index() + 1}</span>
                      <button class="link link-hover">rapporteer</button>
                      <button class="link link-hover">quote</button>
                    </div>
                  </div>

                  <Show
                    when={!post.isDeleted}
                    fallback={
                      <p class="rounded-md border border-dashed border-base-content/20 p-4 italic text-base-content/50">
                        This post has been deleted.
                      </p>
                    }
                  >
                    <div class="space-y-4">
                      <p class="whitespace-pre-wrap text-base leading-relaxed">
                        {post.content}
                      </p>
                      <Show when={post.editedAt}>
                        <p class="text-xs text-base-content/50">
                          Edited on {formatDateTime(post.editedAt)}
                        </p>
                      </Show>
                    </div>
                  </Show>
                </div>
              </div>
            </article>
          )}
        </For>
      </section>

      <Show when={user() && !props.topic.isLocked}>
        {/*
         * The composer is a non-shrinking footer of the viewport-height topic
         * workspace. It therefore stays visible while the sibling post stream
         * scrolls, without covering the final post.
         */}
        <section class="card sticky bottom-0 z-20 shrink-0 border border-base-content/10 bg-base-100 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
          <div class="card-body gap-3 py-4">
            <h3 class="text-lg font-bold">Plaats een reactie</h3>
            <form onSubmit={handleReply} class="space-y-4">
              <Show when={replyError()}>
                {(message) => (
                  <div class="alert alert-error py-2 text-sm" role="alert">
                    <span>{message()}</span>
                  </div>
                )}
              </Show>

              <textarea
                class="textarea textarea-bordered min-h-24 w-full"
                placeholder="Write your reply..."
                value={replyContent()}
                onInput={(event) => {
                  setReplyContent(event.currentTarget.value);
                  setReplyError(null);
                }}
                disabled={replying()}
                required
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={replying()}
                >
                  {replying() ? (
                    <span class="loading loading-spinner loading-sm" />
                  ) : (
                    "Post Reply"
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </Show>

      <Show when={props.topic.isLocked}>
        {/* Locked topics keep a visible footer explaining why no editor exists. */}
        <div class="alert sticky bottom-0 z-20 shrink-0 border border-warning/40 bg-warning/10 text-warning-content shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <span>This topic is locked. No new replies can be posted.</span>
        </div>
      </Show>
    </div>
  );
}
