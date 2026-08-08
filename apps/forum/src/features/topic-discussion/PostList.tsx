import { Avatar, Button } from "@forum/ui";
import { createSignal, For, Show } from "solid-js";
import type { PostView } from "@/features/forum-read/api";
import { PostInteractions } from "@/features/interactions/PostInteractions";
import { useSession } from "@/lib/auth-client";
import { deleteReply, editPost } from "./api";
import { QuoteSnapshot } from "./QuoteSnapshot";

type PostListProps = {
  openingPost: PostView;
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
    ? new Date(value).toLocaleString("nl-NL", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "onbekend tijdstip";

function PostBit(props: {
  post: PostView;
  number: number;
  onQuote: (post: PostView) => void;
  onChanged: () => Promise<void>;
  canReply: boolean;
}) {
  const session = useSession();
  const user = () => session().data?.user;
  const isAuthor = () => user()?.id === props.post.author.id;
  const isAdmin = () =>
    (user() as { role?: string } | undefined)?.role === "admin";
  const authorName = () =>
    props.post.author.displayName ?? props.post.author.name ?? "Onbekend";

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
      setError(
        editError instanceof Error ? editError.message : "Bewerken is mislukt",
      );
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
        deleteError instanceof Error
          ? deleteError.message
          : "Verwijderen is mislukt",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      data-post-kind={props.post.kind}
      class="border-b border-brand-300 bg-base-100 last:border-b-0"
    >
      <div class="grid md:grid-cols-[210px_1fr]">
        <aside class="border-b border-brand-300 bg-base-300 px-5 py-[22px] md:border-r md:border-b-0">
          <div class="flex items-start gap-3 md:block">
            <Avatar
              src={props.post.author.image}
              name={authorName()}
              size="lg"
              alt=""
            />
            <div class="md:mt-3">
              <p class="text-[17px] leading-tight font-extrabold">
                {authorName()}
              </p>
              <Show when={isAuthor() && isAdmin()}>
                <p class="mt-1 text-[12.5px] font-semibold text-primary">
                  beheerder
                </p>
              </Show>
              <p class="mt-1 text-[12.5px] text-brand-700">Lid van het forum</p>
            </div>
          </div>
        </aside>

        <div class="px-6 py-[22px] sm:px-[30px] sm:pb-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-brand-700">
            <span>
              {formatDateTime(props.post.createdAt)} ·{" "}
              {props.post.kind === "opening"
                ? "eerste post"
                : `reactie #${props.number}`}
            </span>
            <div class="flex items-center gap-4">
              <Show when={!props.post.isDeleted && props.canReply}>
                <button
                  type="button"
                  class="font-medium text-primary hover:underline"
                  onClick={() => props.onQuote(props.post)}
                >
                  quoten
                </button>
              </Show>
              <Show when={!props.post.isDeleted && isAuthor()}>
                <button
                  type="button"
                  class="font-medium text-primary hover:underline disabled:opacity-40"
                  onClick={() => {
                    setDraft(props.post.content);
                    setEditing((current) => !current);
                  }}
                  disabled={busy()}
                >
                  bewerken
                </button>
              </Show>
              <Show
                when={
                  props.post.kind === "reply" &&
                  !props.post.isDeleted &&
                  (isAuthor() || isAdmin())
                }
              >
                <button
                  type="button"
                  class="font-medium text-error hover:underline disabled:opacity-40"
                  onClick={remove}
                  disabled={busy()}
                >
                  verwijderen
                </button>
              </Show>
            </div>
          </div>

          <Show when={error()}>
            {(message) => (
              <div
                class="mb-4 border-l-[3px] border-error bg-error/10 px-4 py-2 text-sm text-error"
                role="alert"
              >
                {message()}
              </div>
            )}
          </Show>

          <Show
            when={!props.post.isDeleted}
            fallback={
              <p class="border border-dashed border-brand-300 bg-base-200 p-4 italic text-brand-700">
                Dit bericht is verwijderd.
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
                  <p class="max-w-[70ch] whitespace-pre-wrap text-base leading-[1.68] text-wrap-pretty">
                    {props.post.content}
                  </p>
                }
              >
                <div class="space-y-2">
                  <textarea
                    class="textarea min-h-24 w-full rounded-none border-brand-300 bg-base-100"
                    value={draft()}
                    onInput={(event) => setDraft(event.currentTarget.value)}
                    disabled={busy()}
                    aria-label="Reactie bewerken"
                  />
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setEditing(false)}
                      disabled={busy()}
                    >
                      Annuleren
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={saveEdit}
                      disabled={busy()}
                    >
                      Opslaan
                    </Button>
                  </div>
                </div>
              </Show>
              <Show when={props.post.editedAt}>
                <p class="text-[12.5px] text-brand-700">
                  Bewerkt op {formatDateTime(props.post.editedAt)}
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
    <section aria-label="Berichten">
      <PostBit
        post={props.openingPost}
        number={1}
        onQuote={props.onQuote}
        onChanged={props.onChanged}
        canReply={props.canReply}
      />

      <For
        each={props.replies}
        fallback={
          <p class="border-b border-brand-300 bg-base-100 px-6 py-8 text-sm text-brand-700 sm:px-[30px]">
            Nog geen reacties. Schuif gerust als eerste aan.
          </p>
        }
      >
        {(post, index) => (
          <PostBit
            post={post}
            number={index() + 2}
            onQuote={props.onQuote}
            onChanged={props.onChanged}
            canReply={props.canReply}
          />
        )}
      </For>

      <Show when={props.nextCursor}>
        <div class="flex justify-center bg-base-100 py-4">
          <Button
            variant="surface"
            size="sm"
            loading={props.loadingMore}
            onClick={() => void props.onLoadMore()}
          >
            {props.loadingMore ? "Reacties laden…" : "Meer reacties laden"}
          </Button>
        </div>
      </Show>
    </section>
  );
}
