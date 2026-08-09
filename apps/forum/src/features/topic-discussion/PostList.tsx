import { Avatar, Button } from "@forum/ui";
import { createSignal, For, Show } from "solid-js";
import { RelativeTime } from "@/components/RelativeTime";
import type { PostView } from "@/features/forum-read/api";
import { PostInteractions } from "@/features/interactions/PostInteractions";
import { useSession } from "@/lib/auth-client";
import { userFacingError } from "@/lib/user-facing-error";
import { deleteReply, editPost } from "./api";
import { QuoteSnapshot } from "./QuoteSnapshot";

type PostListProps = {
  openingPost: PostView;
  replies: PostView[];
  replyStartIndex: number;
  onQuote: (post: PostView) => void;
  onChanged: () => Promise<void>;
  canReply: boolean;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => Promise<void>;
};

const numberFormatter = new Intl.NumberFormat("nl-NL");
const yearFormatter = new Intl.DateTimeFormat("nl-NL", {
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

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
  const membership = () => {
    const year = props.post.author.memberSince
      ? yearFormatter.format(new Date(props.post.author.memberSince))
      : null;
    const posts = `${numberFormatter.format(props.post.author.postCount)} posts`;
    return year ? `lid sinds ${year} · ${posts}` : posts;
  };

  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal(props.post.content);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [linkStatus, setLinkStatus] = createSignal<string | null>(null);

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      await editPost(props.post.id, draft());
      setEditing(false);
      await props.onChanged();
    } catch (editError) {
      setError(
        userFacingError(
          editError,
          "Bewerken is mislukt. Probeer het nog eens.",
        ),
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
        userFacingError(
          deleteError,
          "Verwijderen is mislukt. Probeer het nog eens.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const copyPermalink = async () => {
    const url = new URL(window.location.href);
    url.hash = `post-${props.post.id}`;

    try {
      await navigator.clipboard.writeText(url.toString());
      setLinkStatus("Link gekopieerd");
    } catch {
      // Clipboard permissions vary by browser context. The temporary field is
      // used only after the modern API rejects and never contains private data.
      const field = document.createElement("textarea");
      field.value = url.toString();
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      setLinkStatus(copied ? "Link gekopieerd" : "Kopiëren is mislukt");
    }
  };

  return (
    <article
      id={`post-${props.post.id}`}
      data-post-kind={props.post.kind}
      aria-label={`${props.post.kind === "opening" ? "Eerste bericht" : `Reactie ${props.number}`} van ${authorName()}`}
      class="border-b border-brand-300 bg-base-100 last:border-b-0"
    >
      <div class="grid md:grid-cols-[210px_1fr]">
        <div class="border-b border-brand-300 bg-base-100 px-4 py-4 md:border-r md:border-b-0 md:bg-base-300 md:px-5 md:py-[22px]">
          <div class="flex items-start gap-3 md:hidden">
            <Avatar
              src={props.post.author.image}
              name={authorName()}
              size="shell"
              alt=""
            />
            <div>
              <p class="text-[14.5px] leading-tight font-extrabold">
                {authorName()}
              </p>
              <Show when={props.post.author.role === "admin"}>
                <p class="mt-0.5 text-[11.5px] font-normal text-primary">
                  beheerder
                </p>
              </Show>
              <p class="mt-0.5 text-[11.5px] text-brand-700">{membership()}</p>
            </div>
            <RelativeTime
              value={props.post.createdAt}
              class="ml-auto text-[11.5px] text-brand-700"
            />
          </div>

          <div class="hidden md:block">
            <Avatar
              src={props.post.author.image}
              name={authorName()}
              size="lg"
              alt=""
            />
            <div class="mt-3">
              <p class="text-[17px] leading-tight font-extrabold">
                {authorName()}
              </p>
              <Show when={props.post.author.role === "admin"}>
                <p class="mt-1 text-[13px] font-normal text-primary">
                  beheerder
                </p>
              </Show>
              <p class="mt-1 text-[13px] text-brand-700">{membership()}</p>
              <Show when={props.post.author.tagline}>
                {(tagline) => (
                  <p class="mt-4 line-clamp-2 text-[12.5px] leading-[1.5] italic text-brand-800">
                    “{tagline()}”
                  </p>
                )}
              </Show>
            </div>
          </div>
        </div>

        <div class="px-6 py-[22px] sm:px-[30px] sm:pb-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-brand-700 md:text-[13px]">
            <span class="hidden sm:inline">
              <RelativeTime value={props.post.createdAt} /> ·{" "}
              {props.post.kind === "opening"
                ? "eerste post"
                : `reactie #${props.number}`}
            </span>
            <div class="ml-auto flex items-center gap-4">
              <Show when={!props.post.isDeleted && props.canReply}>
                <button
                  type="button"
                  class="min-h-11 font-medium text-primary hover:underline md:min-h-8"
                  onClick={() => props.onQuote(props.post)}
                >
                  quoten
                </button>
              </Show>
              <button
                type="button"
                class="min-h-11 min-w-11 font-medium text-primary hover:underline md:min-h-8 md:min-w-8"
                aria-label="Kopieer link naar bericht"
                aria-live="polite"
                onClick={() => void copyPermalink()}
              >
                {linkStatus() ?? "link"}
              </button>
              <Show when={!props.post.isDeleted && isAuthor()}>
                <button
                  type="button"
                  class="min-h-11 font-medium text-primary hover:underline disabled:opacity-40 md:min-h-8"
                  onClick={() => {
                    setDraft(props.post.content);
                    setEditing((current) => !current);
                  }}
                  disabled={busy()}
                  aria-expanded={editing()}
                  aria-controls={`post-editor-${props.post.id}`}
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
                  class="min-h-11 font-medium text-error hover:underline disabled:opacity-40 md:min-h-8"
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
                  <p class="max-w-[70ch] whitespace-pre-wrap text-[15px] leading-[1.6] text-wrap-pretty [overflow-wrap:anywhere] md:text-base md:leading-[1.68]">
                    {props.post.content}
                  </p>
                }
              >
                <div id={`post-editor-${props.post.id}`} class="space-y-2">
                  <textarea
                    class="textarea min-h-24 w-full max-w-[70ch] rounded-none border-brand-300 bg-base-100 text-[15px] leading-[1.6] md:text-base md:leading-[1.68]"
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
                {(editedAt) => (
                  <p class="text-[12.5px] text-brand-700">
                    Bewerkt <RelativeTime value={editedAt()} />
                  </p>
                )}
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
  const [loadError, setLoadError] = createSignal(false);

  const loadMore = async () => {
    setLoadError(false);
    try {
      await props.onLoadMore();
    } catch {
      setLoadError(true);
    }
  };

  return (
    <section aria-label="Berichten" class="border-b-2 border-base-content">
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
          <p class="bg-base-100 px-6 py-8 text-sm text-brand-700 sm:px-[30px]">
            Nog geen reacties. Schuif gerust als eerste aan.
          </p>
        }
      >
        {(post, index) => (
          <PostBit
            post={post}
            number={props.replyStartIndex + index() + 2}
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
            onClick={() => void loadMore()}
          >
            {props.loadingMore ? "Reacties laden…" : "Meer reacties laden"}
          </Button>
        </div>
      </Show>
      <Show when={loadError()}>
        <p
          class="border-t border-error bg-error/10 px-6 py-3 text-sm text-error sm:px-[30px]"
          role="alert"
        >
          Meer reacties laden is niet gelukt. Probeer het nog eens.
        </p>
      </Show>
    </section>
  );
}
