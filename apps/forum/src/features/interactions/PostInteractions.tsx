import { createResource, For, Show } from "solid-js";
import { useSession } from "@/lib/auth-client";
import {
  applyVote,
  fetchReactions,
  fetchVoteScore,
  toggleReaction,
} from "./api";

/*
 * Minimal reaction and vote controls for a post. Deliberately small: this
 * is not a reaction/vote redesign (plan section 5.6), it just surfaces the
 * existing endpoints so the behavior is reachable and testable from the UI.
 * Counts are refetched after each mutation rather than optimistically
 * patched, so what is displayed always matches the server.
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
    <div class="flex flex-wrap items-center gap-3 pt-2">
      <div class="flex items-center gap-1">
        <For each={QUICK_REACTIONS}>
          {(emoji) => (
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              aria-label={`React with ${emoji}`}
              disabled={!signedIn()}
              onClick={() => void react(emoji)}
            >
              <span aria-hidden="true">{emoji}</span>
              <Show when={countFor(emoji) > 0}>
                <span class="ml-1 text-xs">{countFor(emoji)}</span>
              </Show>
            </button>
          )}
        </For>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          aria-label="Upvote"
          disabled={!signedIn()}
          onClick={() => void vote(1)}
        >
          ▲
        </button>
        {/* role="status" both supports aria-label and announces changes. */}
        <span
          class="text-xs font-semibold"
          role="status"
          aria-label="Vote score"
        >
          {score()?.score ?? 0}
        </span>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          aria-label="Downvote"
          disabled={!signedIn()}
          onClick={() => void vote(-1)}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
