import { Avatar } from "@forum/ui";
import { createSignal, For, Show } from "solid-js";
import type { PostView } from "@/features/forum-read/api";
import { PostInteractions } from "@/features/interactions/PostInteractions";
import { useSession } from "@/lib/auth-client";
import { deleteReply, editPost } from "./api";
import { QuoteSnapshot } from "./QuoteSnapshot";

type PostListProps = {
  replies: PostView[];
  onQuote: (post: PostView) => void;
  onChanged: () => Promise<void>;
  canReply: boolean;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
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

function ReplyCard(props: {
  post: PostView;
  index: number;
  onQuote: (post: PostView) => void;
  onChanged: () => Promise<void>;
  canReply: boolean;
}) {
  const session = useSession();
  const user = () => session().data?.user;
  const isAuthor = () => user()?.id === props.post.author.id;
  const isAdmin = () =>
    (user() as { role?: string } | undefined)?.role === "admin";

  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal(props.post.content);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      await editPost(props.post.id, draft());
      setEditing(false);
      await props.onChanged();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Edit failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteReply(props.post.id);
      await props.onChanged();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete failed",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <article class="overflow-hidden rounded-sm border border-base-content/15 bg-base-100 shadow-sm">
      <div class="grid md:grid-cols-[220px_1fr]">
        <aside class="border-b border-base-content/10 bg-base-200/55 p-4 md:border-b-0 md:border-r">
          <div class="flex items-center gap-3">
            <Avatar
              src={props.post.author.image}
              name={props.post.author.displayName ?? props.post.author.name}
              size="md"
            />
            <div>
              <p class="font-bold leading-tight">
                {props.post.author.displayName ??
                  props.post.author.name ??
                  "Unknown"}
              </p>
              <p class="text-xs text-base-content/60">
                User #{props.post.author.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </aside>

        <div class="p-4 md:p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
            <span>{formatDateTime(props.post.createdAt)}</span>
            <div class="flex items-center gap-3">
              {/* Reply numbering continues after opening post #1. */}
              <span>#{props.index + 2}</span>
              <Show when={!props.post.isDeleted && props.canReply}>
                <button
                  type="button"
                  class="link link-hover"
                  onClick={() => props.onQuote(props.post)}
                >
                  quote
                </button>
              </Show>
              <Show when={!props.post.isDeleted && isAuthor()}>
                <button
                  type="button"
                  class="link link-hover"
                  onClick={() => {
                    setDraft(props.post.content);
                    setEditing((current) => !current);
                  }}
                  disabled={busy()}
                >
                  bewerk
                </button>
              </Show>
              <Show when={!props.post.isDeleted && (isAuthor() || isAdmin())}>
                <button
                  type="button"
                  class="link link-hover text-error"
                  onClick={remove}
                  disabled={busy()}
                >
                  verwijder
                </button>
              </Show>
            </div>
          </div>

          <Show when={error()}>
            {(message) => (
              <div class="alert alert-error mb-3 py-2 text-sm" role="alert">
                <span>{message()}</span>
              </div>
            )}
          </Show>

          <Show
            when={!props.post.isDeleted}
            fallback={
              <p class="rounded-md border border-dashed border-base-content/20 p-4 italic text-base-content/50">
                This post has been deleted.
              </p>
            }
          >
            <div class="space-y-4">
              <Show when={props.post.quote}>
                {(quote) => (
                  <QuoteSnapshot
                    authorName={quote().authorName}
                    content={quote().content}
                  />
                )}
              </Show>
              <Show
                when={editing()}
                fallback={
                  <p class="whitespace-pre-wrap text-base leading-relaxed">
                    {props.post.content}
                  </p>
                }
              >
                <div class="space-y-2">
                  <textarea
                    class="textarea textarea-bordered min-h-24 w-full"
                    value={draft()}
                    onInput={(event) => setDraft(event.currentTarget.value)}
                    disabled={busy()}
                    aria-label="Edit reply"
                  />
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      onClick={() => setEditing(false)}
                      disabled={busy()}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      class="btn btn-primary btn-xs"
                      onClick={saveEdit}
                      disabled={busy()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </Show>
              <Show when={props.post.editedAt}>
                <p class="text-xs text-base-content/50">
                  Edited on {formatDateTime(props.post.editedAt)}
                </p>
              </Show>
              <PostInteractions postId={props.post.id} />
            </div>
          </Show>
        </div>
      </div>
    </article>
  );
}

export function PostList(props: PostListProps) {
  return (
    <section class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
      <For
        each={props.replies}
        fallback={
          <div class="rounded-sm border border-dashed border-base-content/20 bg-base-100 p-6 text-center text-sm text-base-content/60">
            No replies yet. Be the first to join the discussion.
          </div>
        }
      >
        {(post, index) => (
          <ReplyCard
            post={post}
            index={index()}
            onQuote={props.onQuote}
            onChanged={props.onChanged}
            canReply={props.canReply}
          />
        )}
      </For>

      <Show when={props.nextCursor}>
        <div class="flex justify-center py-2">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            onClick={() => void props.onLoadMore()}
            disabled={props.loadingMore}
          >
            {props.loadingMore ? (
              <span class="loading loading-spinner loading-xs" />
            ) : (
              "Load more replies"
            )}
          </button>
        </div>
      </Show>
    </section>
  );
}
