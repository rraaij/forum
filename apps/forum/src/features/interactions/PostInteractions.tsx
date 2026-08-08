import { Button } from "@forum/ui";
import { createResource, For, Show } from "solid-js";
import { useSession } from "@/lib/auth-client";
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
const QUICK_REACTIONS = ["👍", "🎉", "❤️"];

type PostInteractionsProps = {
  postId: string;
};

export function PostInteractions(props: PostInteractionsProps) {
  const session = useSession();
  const signedIn = () => Boolean(session().data?.user);

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

  const react = async (emoji: string) => {
    await toggleReaction(props.postId, emoji);
    await refetchReactions();
  };

  const vote = async (value: 1 | -1) => {
    await applyVote(props.postId, value);
    await refetchScore();
  };

  return (
    <div class="flex flex-wrap items-center gap-2 pt-2">
      <For each={QUICK_REACTIONS}>
        {(emoji) => (
          <Button
            type="button"
            variant="surface"
            size="xs"
            aria-label={`Reageer met ${emoji}`}
            disabled={!signedIn()}
            onClick={() => void react(emoji)}
          >
            <span aria-hidden="true">{emoji}</span>
            <Show when={countFor(emoji) > 0}>
              <span class="ml-1 text-xs">{countFor(emoji)}</span>
            </Show>
          </Button>
        )}
      </For>

      <div class="ml-auto flex items-center gap-1 text-sm font-bold text-brand-700">
        <button
          type="button"
          class="min-h-8 min-w-8 text-primary disabled:opacity-40"
          aria-label="Omhoog stemmen"
          disabled={!signedIn()}
          onClick={() => void vote(1)}
        >
          ▲
        </button>
        <span role="status" aria-label="Stemscore">
          {score()?.score ?? 0}
        </span>
        <button
          type="button"
          class="min-h-8 min-w-8 text-primary disabled:opacity-40"
          aria-label="Omlaag stemmen"
          disabled={!signedIn()}
          onClick={() => void vote(-1)}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
