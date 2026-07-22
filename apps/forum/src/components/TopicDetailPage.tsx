import { Avatar } from "@forum/ui";
import { Link, useRouter } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show } from "solid-js";
import PageHeader from "@/components/PageHeader";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import type { ForumPost, TopicDetail } from "@/types/forum";

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

type Quote = {
  content: string;
  authorName: string;
};

/*
 * Quotes are stored as readable blockquote lines followed by the user's own
 * response. This avoids a database migration while retaining enough structure
 * to render the quote differently whenever the post is loaded again.
 */
const serializeQuotedReply = (quote: Quote, response: string) => {
  const quotedLines = `“${quote.content}”`
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return `${quotedLines}\n> — ${quote.authorName}\n\n${response}`;
};

/*
 * Only parse the exact format produced above. Ordinary posts remain plain text,
 * including posts that happen to contain a greater-than character elsewhere.
 */
const parseQuotedReply = (
  content: string,
): { quote: Quote; response: string } | undefined => {
  const lines = content.split("\n");
  if (!lines[0]?.startsWith("> “")) return undefined;

  const quoteLineCount = lines.findIndex((line) => !line.startsWith("> "));
  const endIndex = quoteLineCount === -1 ? lines.length : quoteLineCount;
  const quoteLines = lines.slice(0, endIndex);
  const attribution = quoteLines.at(-1)?.slice(2);

  if (!attribution?.startsWith("— ") || quoteLines.length < 2) {
    return undefined;
  }

  const wrappedQuote = quoteLines
    .slice(0, -1)
    .map((line) => line.slice(2))
    .join("\n");

  if (!wrappedQuote.startsWith("“") || !wrappedQuote.endsWith("”")) {
    return undefined;
  }

  return {
    quote: {
      content: wrappedQuote.slice(1, -1),
      authorName: attribution.slice(2),
    },
    response: lines.slice(endIndex).join("\n").trimStart(),
  };
};

/*
 * A shared renderer gives quote previews and persisted replies the same visual
 * language: pale background, visible quotation marks, and author attribution.
 */
function QuoteBlock(props: {
  quote: Quote;
  onRemove?: () => void;
  onContentChange?: (content: string) => void;
}) {
  return (
    <blockquote class="relative rounded-sm border border-slate-200 bg-slate-100 px-5 py-3 text-slate-700">
      <Show when={props.onRemove}>
        {(onRemove) => (
          <button
            type="button"
            class="btn btn-ghost btn-xs absolute right-1 top-1 text-slate-500"
            onClick={onRemove()}
            aria-label="Remove quoted post"
          >
            ×
          </button>
        )}
      </Show>
      <Show
        when={props.onContentChange}
        fallback={
          <p class="whitespace-pre-wrap pr-5 text-sm leading-relaxed">
            <span aria-hidden="true">“</span>
            {props.quote.content}
            <span aria-hidden="true">”</span>
          </p>
        }
      >
        {(onContentChange) => (
          /*
           * In the composer, the quote itself is a controlled textarea. Users
           * can remove irrelevant paragraphs while the visible quotation
           * characters remain outside the editable source text.
           */
          <div class="relative pr-5">
            <span
              class="pointer-events-none absolute left-2 top-1 text-xl text-slate-400"
              aria-hidden="true"
            >
              “
            </span>
            <textarea
              class="textarea min-h-20 w-full resize-y border border-slate-300 bg-white/60 px-6 py-2 text-sm leading-relaxed text-slate-700 focus:border-slate-400 focus:outline-none"
              value={props.quote.content}
              onInput={(event) => onContentChange()(event.currentTarget.value)}
              aria-label={`Edit quote from ${props.quote.authorName}`}
            />
            <span
              class="pointer-events-none absolute bottom-1 right-7 text-xl text-slate-400"
              aria-hidden="true"
            >
              ”
            </span>
          </div>
        )}
      </Show>
      <footer class="mt-1 text-xs font-semibold text-slate-500">
        — {props.quote.authorName}
      </footer>
    </blockquote>
  );
}

function PostContent(props: { content: string }) {
  const parsedContent = createMemo(() => parseQuotedReply(props.content));

  return (
    <div class="space-y-4">
      <Show when={parsedContent()?.quote}>
        {(quote) => <QuoteBlock quote={quote()} />}
      </Show>
      <Show when={parsedContent()?.response ?? props.content}>
        {(response) => (
          <p class="whitespace-pre-wrap text-base leading-relaxed">
            {response()}
          </p>
        )}
      </Show>
    </div>
  );
}

export default function TopicDetailPage(props: TopicDetailPageProps) {
  const router = useRouter();
  const session = useSession();
  const user = () => session().data?.user;

  const [replyContent, setReplyContent] = createSignal("");
  const [quotedPost, setQuotedPost] = createSignal<Quote>();
  const [replying, setReplying] = createSignal(false);
  const [replyError, setReplyError] = createSignal<string | null>(null);
  let replyField: HTMLTextAreaElement | undefined;

  /*
   * Keep the opening post separate from the replies because it is presented in
   * the page header. These memos update automatically after route invalidation
   * adds a newly-submitted reply to the topic payload.
   */
  const openingPost = createMemo(() => props.topic.posts[0]);
  const replies = createMemo(() => props.topic.posts.slice(1));

  // A topic's first post is the opening message; every later post is a reply.
  const replyCount = createMemo(() => Math.max(0, props.topic.postCount - 1));

  const openingPostText = createMemo(() => {
    const post = openingPost();
    if (!post) return "This topic does not have an opening post.";
    if (post.isDeleted) return "This opening post has been deleted.";
    return post.content;
  });

  const openingPostAuthor = createMemo(() => {
    const post = openingPost();
    return post
      ? {
          name: post.authorName,
          image: post.authorImage,
          // Format once at the topic boundary so the reusable header remains
          // presentation-only and does not need to understand API timestamps.
          createdAt: formatDateTime(post.createdAt),
        }
      : undefined;
  });

  const handleQuote = (post: ForumPost) => {
    /*
     * When quoting a reply that already contains a quote, copy only its own
     * response. This prevents increasingly deep quote-within-quote chains.
     */
    const parsedPost = parseQuotedReply(post.content);
    setQuotedPost({
      content: parsedPost?.response || post.content,
      authorName: post.authorName ?? "Unknown",
    });
    setReplyError(null);

    // Focusing also scrolls the sticky composer into view for keyboard users.
    replyField?.focus();
  };

  const handleReply = async (event: SubmitEvent) => {
    event.preventDefault();

    const response = replyContent().trim();
    if (!response) {
      setReplyError("Write a reply before posting.");
      return;
    }

    setReplying(true);
    setReplyError(null);

    try {
      // Include the selected quote in the persisted content so it remains
      // visible after invalidation and on future visits to this topic.
      const quote = quotedPost();
      let content = response;

      /*
       * Narrow the complete quote object before spreading it. Checking only an
       * optionally-chained content string does not prove to TypeScript that the
       * sibling authorName property exists on the original object.
       */
      if (quote) {
        const trimmedQuote = quote.content.trim();
        if (trimmedQuote) {
          content = serializeQuotedReply(
            { ...quote, content: trimmedQuote },
            response,
          );
        }
      }

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
      setQuotedPost(undefined);

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
          description={openingPostText()}
          author={openingPostAuthor()}
          stats={[
            { label: "views", value: String(props.topic.viewCount) },
            { label: "replies", value: String(replyCount()) },
          ]}
        />
      </div>

      {/*
       * This is the only growing region in the topic workspace. `min-h-0` is
       * required for a flex child to shrink below its content height, allowing
       * overflow-y-auto to create the requested independent post scrollbar.
       */}
      <section class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        <For
          each={replies()}
          fallback={
            <div class="rounded-sm border border-dashed border-base-content/20 bg-base-100 p-6 text-center text-sm text-base-content/60">
              No replies yet. Be the first to join the discussion.
            </div>
          }
        >
          {(post, index) => (
            <article class="overflow-hidden rounded-sm border border-base-content/15 bg-base-100 shadow-sm">
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
                      {/* Reply numbering continues after opening post #1. */}
                      <span>#{index() + 2}</span>
                      <button class="link link-hover">rapporteer</button>
                      <button
                        type="button"
                        class="link link-hover"
                        onClick={() => handleQuote(post)}
                      >
                        quote
                      </button>
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
                      <PostContent content={post.content} />
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

              {/*
               * The quote preview and textarea share one border so the quoted
               * content feels copied into the response field while remaining
               * visually distinct from the user's new words.
               */}
              <div class="overflow-hidden rounded-sm border border-base-content/20 bg-base-100 focus-within:border-primary">
                <Show when={quotedPost()}>
                  {(quote) => (
                    <div class="p-2 pb-0">
                      <QuoteBlock
                        quote={quote()}
                        onRemove={() => setQuotedPost(undefined)}
                        onContentChange={(content) =>
                          setQuotedPost((currentQuote) =>
                            currentQuote
                              ? { ...currentQuote, content }
                              : currentQuote,
                          )
                        }
                      />
                    </div>
                  )}
                </Show>
                <textarea
                  ref={(element) => {
                    replyField = element;
                  }}
                  class="textarea min-h-24 w-full resize-y rounded-none border-0 focus:outline-none"
                  placeholder="Write your reply..."
                  value={replyContent()}
                  onInput={(event) => {
                    setReplyContent(event.currentTarget.value);
                    setReplyError(null);
                  }}
                  disabled={replying()}
                  required
                />
              </div>
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
