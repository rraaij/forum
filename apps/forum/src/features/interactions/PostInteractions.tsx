import { Button } from "@forum/ui";
import { ChevronDown, ChevronUp } from "lucide-solid";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { useSession } from "@/lib/auth-client";
import { userFacingError } from "@/lib/user-facing-error";
import {
  applyVote,
  fetchReactions,
  fetchVoteScore,
  toggleReaction,
} from "./api";

/*
 * Counts are refetched after each mutation rather than optimistically patched,
 * so the controls always display the server's authoritative reaction state.
 */
const QUICK_REACTIONS = ["👍", "🎉", "❤️"] as const;

type PostInteractionsProps = {
  postId: string;
};

export function PostInteractions(props: PostInteractionsProps) {
  const session = useSession();
  const signedIn = () => Boolean(session().data?.user);
  const [pickerOpen, setPickerOpen] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let pickerTrigger: HTMLButtonElement | undefined;

  const [reactions, { refetch: refetchReactions }] = createResource(
    () => props.postId,
    fetchReactions,
  );
  const [score, { refetch: refetchScore }] = createResource(
    () => props.postId,
    fetchVoteScore,
  );

  const countFor = (emoji: string) =>
    reactions()?.find((entry) => entry.emoji === emoji)?.count ?? 0;
  const visibleReactions = createMemo(() =>
    (reactions() ?? []).filter((reaction) => reaction.count > 0),
  );

  const react = async (emoji: string) => {
    const shouldReturnFocus = pickerOpen();
    setBusy(true);
    setError(null);
    try {
      await toggleReaction(props.postId, emoji);
      await refetchReactions();
      setPickerOpen(false);
      if (shouldReturnFocus) queueMicrotask(() => pickerTrigger?.focus());
    } catch (reactionError) {
      setError(
        userFacingError(
          reactionError,
          "De reactie kon niet worden opgeslagen.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const vote = async (value: 1 | -1) => {
    setBusy(true);
    setError(null);
    try {
      await applyVote(props.postId, value);
      await refetchScore();
    } catch (voteError) {
      setError(
        userFacingError(voteError, "Je stem kon niet worden opgeslagen."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="relative flex flex-wrap items-center gap-2 pt-2">
      <For each={visibleReactions()}>
        {(reaction) => (
          <Button
            type="button"
            variant="surface"
            size="xs"
            class="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
            aria-label={`Reageer met ${reaction.emoji}, nu ${reaction.count}`}
            disabled={!signedIn() || busy()}
            onClick={() => void react(reaction.emoji)}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span class="ml-1 text-xs">{reaction.count}</span>
          </Button>
        )}
      </For>

      <Button
        ref={(element) => {
          pickerTrigger = element;
        }}
        type="button"
        variant="ghost"
        size="xs"
        class="min-h-11 border border-brand-300 px-3 text-primary md:min-h-8"
        aria-expanded={pickerOpen()}
        aria-controls={`reaction-picker-${props.postId}`}
        disabled={!signedIn() || busy()}
        onClick={() => setPickerOpen((open) => !open)}
      >
        + reactie
      </Button>

      <Show when={pickerOpen()}>
        <fieldset
          id={`reaction-picker-${props.postId}`}
          class="flex items-center gap-1 border border-brand-300 bg-base-100 p-1"
        >
          <legend class="sr-only">Kies een reactie</legend>
          <For each={QUICK_REACTIONS}>
            {(emoji) => (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                class="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
                aria-label={`Reageer met ${emoji}, nu ${countFor(emoji)}`}
                disabled={busy()}
                onClick={() => void react(emoji)}
              >
                <span aria-hidden="true">{emoji}</span>
                <Show when={countFor(emoji) > 0}>
                  <span class="ml-1 text-xs">{countFor(emoji)}</span>
                </Show>
              </Button>
            )}
          </For>
        </fieldset>
      </Show>

      <div class="ml-auto flex items-center gap-1 text-sm font-bold text-brand-700">
        <button
          type="button"
          class="min-h-11 min-w-11 text-primary transition-colors hover:bg-base-300 disabled:pointer-events-none disabled:opacity-40 md:min-h-8 md:min-w-8"
          aria-label="Omhoog stemmen"
          disabled={!signedIn() || busy()}
          onClick={() => void vote(1)}
        >
          <ChevronUp
            aria-hidden="true"
            class="mx-auto size-4"
            strokeWidth={2}
          />
        </button>
        <span role="status" aria-label="Stemscore">
          {score()?.score ?? 0}
        </span>
        <button
          type="button"
          class="min-h-11 min-w-11 text-primary transition-colors hover:bg-base-300 disabled:pointer-events-none disabled:opacity-40 md:min-h-8 md:min-w-8"
          aria-label="Omlaag stemmen"
          disabled={!signedIn() || busy()}
          onClick={() => void vote(-1)}
        >
          <ChevronDown
            aria-hidden="true"
            class="mx-auto size-4"
            strokeWidth={2}
          />
        </button>
      </div>
      <Show when={error()}>
        {(message) => (
          <p class="w-full text-sm text-error" role="alert">
            {message()}
          </p>
        )}
      </Show>
    </div>
  );
}
