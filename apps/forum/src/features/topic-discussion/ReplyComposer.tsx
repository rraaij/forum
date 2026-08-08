import { Avatar, Button } from "@forum/ui";
import { createSignal, Show } from "solid-js";
import type { PostView } from "@/features/forum-read/api";
import { replyToTopic } from "./api";
import { QuoteSnapshot } from "./QuoteSnapshot";

type ReplyComposerProps = {
  topicId: string;
  userName: string;
  userImage?: string | null;
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
      setError("Schrijf eerst een reactie.");
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
          : "De reactie kon niet worden geplaatst.",
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <section class="border-t-2 border-base-content bg-base-300 px-6 py-6 sm:px-10">
      <div class="mb-3 flex items-center gap-3">
        <Avatar src={props.userImage} name={props.userName} size="sm" alt="" />
        <h2 class="text-[18px] font-semibold">
          Wat denk jij, {props.userName}?
        </h2>
      </div>

      <form onSubmit={handleSubmit} class="space-y-4">
        <Show when={error()}>
          {(message) => (
            <div
              class="border-l-[3px] border-error bg-error/10 px-4 py-2 text-sm text-error"
              role="alert"
            >
              {message()}
            </div>
          )}
        </Show>

        <div class="border border-brand-300 bg-base-100 focus-within:border-primary">
          <Show when={props.quotedPost}>
            {(quoted) => (
              <div class="p-3 pb-0">
                <QuoteSnapshot
                  authorName={
                    quoted().author.displayName ??
                    quoted().author.name ??
                    "Onbekend"
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
            class="textarea min-h-[104px] w-full resize-y rounded-none border-0 bg-base-100 focus:outline-none"
            placeholder="Typ je reactie… quoten kan met de knop bij een post."
            value={content()}
            onInput={(event) => {
              setContent(event.currentTarget.value);
              setError(null);
            }}
            disabled={posting()}
            required
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" loading={posting()}>
            {posting() ? "Reactie plaatsen…" : "Plaats reactie"}
          </Button>
          <Button type="button" variant="surface">
            Voorbeeld
          </Button>
          <p class="ml-auto text-[12.5px] text-brand-700">
            Wees aardig. Dat scheelt iedereen tijd.
          </p>
        </div>
      </form>
    </section>
  );
}
