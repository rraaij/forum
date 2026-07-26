import { createSignal, Show } from "solid-js";
import type { PostView } from "@/features/forum-read/api";
import { replyToTopic } from "./api";
import { QuoteSnapshot } from "./QuoteSnapshot";

type ReplyComposerProps = {
  topicId: string;
  quotedPost: PostView | null;
  onRemoveQuote: () => void;
  onPosted: () => Promise<void>;
  registerFocus?: (focus: () => void) => void;
};

/*
 * Quoting sends only quotedPostId (plan section 7.2): the server builds the
 * immutable snapshot inside the reply transaction. The preview here shows
 * the source post as it currently reads.
 */
export function ReplyComposer(props: ReplyComposerProps) {
  const [content, setContent] = createSignal("");
  const [posting, setPosting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let field: HTMLTextAreaElement | undefined;

  props.registerFocus?.(() => field?.focus());

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const trimmed = content().trim();
    if (!trimmed) {
      setError("Write a reply before posting.");
      return;
    }

    setPosting(true);
    setError(null);
    try {
      await replyToTopic({
        topicId: props.topicId,
        content: trimmed,
        quotedPostId: props.quotedPost?.id,
      });
      setContent("");
      props.onRemoveQuote();
      await props.onPosted();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The reply could not be posted.",
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <section class="card sticky bottom-0 z-20 shrink-0 border border-base-content/10 bg-base-100 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
      <div class="card-body gap-3 py-4">
        <h3 class="text-lg font-bold">Plaats een reactie</h3>
        <form onSubmit={handleSubmit} class="space-y-4">
          <Show when={error()}>
            {(message) => (
              <div class="alert alert-error py-2 text-sm" role="alert">
                <span>{message()}</span>
              </div>
            )}
          </Show>

          <div class="overflow-hidden rounded-sm border border-base-content/20 bg-base-100 focus-within:border-primary">
            <Show when={props.quotedPost}>
              {(quoted) => (
                <div class="p-2 pb-0">
                  <QuoteSnapshot
                    authorName={
                      quoted().author.displayName ??
                      quoted().author.name ??
                      "Unknown"
                    }
                    content={quoted().content}
                    onRemove={props.onRemoveQuote}
                  />
                </div>
              )}
            </Show>
            <textarea
              ref={(element) => {
                field = element;
              }}
              class="textarea min-h-24 w-full resize-y rounded-none border-0 focus:outline-none"
              placeholder="Write your reply..."
              value={content()}
              onInput={(event) => {
                setContent(event.currentTarget.value);
                setError(null);
              }}
              disabled={posting()}
              required
            />
          </div>
          <div class="flex justify-end">
            <button type="submit" class="btn btn-primary" disabled={posting()}>
              {posting() ? (
                <span class="loading loading-spinner loading-sm" />
              ) : (
                "Post Reply"
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
