import { Avatar, Button } from "@forum/ui";
import { createSignal, Show } from "solid-js";
import type { PostView } from "@/features/forum-read/api";
import { userFacingError } from "@/lib/user-facing-error";
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
  const [showPreview, setShowPreview] = createSignal(false);
  let field: HTMLTextAreaElement | undefined;

  props.registerFocus?.(() => field?.focus());

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const trimmed = content().trim();
    if (!trimmed) {
      setError("Schrijf eerst een reactie.");
      field?.focus();
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
      setShowPreview(false);
      props.onRemoveQuote();
      await props.onPosted();
    } catch (submitError) {
      setError(
        userFacingError(
          submitError,
          "De reactie kon niet worden geplaatst. Probeer het nog eens.",
        ),
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <section class="bg-base-300 px-4 py-4 sm:px-10 sm:py-6">
      <div class="mb-3 hidden items-center gap-3 sm:flex">
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
          <div class="flex items-stretch sm:block">
            <textarea
              ref={(element) => {
                field = element;
              }}
              name="content"
              aria-label="Jouw reactie"
              class="textarea min-h-11 flex-1 resize-none rounded-none border-0 bg-base-100 px-3 py-3 sm:min-h-[104px] sm:w-full sm:resize-y"
              placeholder="Typ je reactie… quoten kan met de knop bij een post."
              spellcheck={true}
              value={content()}
              onInput={(event) => {
                setContent(event.currentTarget.value);
                setError(null);
                setShowPreview(false);
              }}
              disabled={posting()}
              required
            />
            <Button
              type="submit"
              variant="primary"
              class="m-1 min-h-11 shrink-0 sm:hidden"
              loading={posting()}
            >
              {posting() ? "Plaatsen…" : "Plaats"}
            </Button>
          </div>
        </div>

        <Show when={showPreview()}>
          <div
            class="border-l-[3px] border-primary bg-base-100 px-4 py-3"
            aria-live="polite"
          >
            <p class="mb-1 text-[12.5px] font-bold text-brand-700">Voorbeeld</p>
            {/* Posts are plain text today; never turn a draft into unsanitized HTML. */}
            <p class="max-w-[70ch] whitespace-pre-wrap text-[15px] leading-[1.6] md:text-base md:leading-[1.68]">
              {content().trim() ||
                "Je voorbeeld verschijnt zodra je iets schrijft."}
            </p>
          </div>
        </Show>

        <div class="hidden flex-wrap items-center gap-2 sm:flex">
          <Button
            type="submit"
            variant="primary"
            class="sm:min-h-9"
            loading={posting()}
          >
            {posting() ? "Reactie plaatsen…" : "Plaats reactie"}
          </Button>
          <Button
            type="button"
            variant="surface"
            class="sm:min-h-9"
            aria-pressed={showPreview()}
            onClick={() => setShowPreview((visible) => !visible)}
          >
            {showPreview() ? "Voorbeeld sluiten" : "Voorbeeld"}
          </Button>
          <p class="ml-auto text-[12.5px] text-brand-700">
            Wees aardig. Dat scheelt iedereen tijd.
          </p>
        </div>
      </form>
    </section>
  );
}
