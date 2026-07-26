import { createSignal, Show } from "solid-js";
import type { BoardTreeNode } from "@/features/forum-read/api";
import { fetchPurgeImpact, type PurgeImpact } from "./api";

type PurgeBoardDialogProps = {
  board: BoardTreeNode;
  disabled?: boolean;
  onPurge: (confirmationName: string, impact: PurgeImpact) => Promise<boolean>;
};

/*
 * Recursive purge is a confirmed, race-checked command (plan section 5.3):
 * the operator must SEE the impact, then retype the board name exactly.
 * The submitted counts are sent back so the server can reject the purge
 * with PURGE_IMPACT_CHANGED if anything changed since the preview.
 */
export function PurgeBoardDialog(props: PurgeBoardDialogProps) {
  const [impact, setImpact] = createSignal<PurgeImpact | null>(null);
  const [confirmation, setConfirmation] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [previewError, setPreviewError] = createSignal<string | null>(null);

  const loadImpact = async () => {
    setLoading(true);
    // A failed refresh must never leave an older preview actionable.
    setImpact(null);
    setPreviewError(null);
    setConfirmation("");
    try {
      setImpact(await fetchPurgeImpact(props.board.id));
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Could not load impact",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section class="space-y-3 rounded-lg border border-error/40 bg-error/5 p-3">
      <h3 class="font-bold text-error">Delete board and all its content</h3>

      <button
        type="button"
        class="btn btn-outline btn-error btn-sm"
        onClick={loadImpact}
        disabled={props.disabled || loading()}
      >
        {loading() ? "Calculating…" : "Preview impact"}
      </button>

      <Show when={previewError()}>
        {(message) => (
          <div class="alert alert-error py-2 text-sm" role="alert">
            <span>{message()}</span>
          </div>
        )}
      </Show>

      <Show when={impact()}>
        {(current) => (
          <div class="space-y-3">
            <ul class="grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-3">
              <li>
                Boards: <strong>{current().counts.boards}</strong>
              </li>
              <li>
                Topics: <strong>{current().counts.topics}</strong>
              </li>
              <li>
                Posts: <strong>{current().counts.posts}</strong>
              </li>
              <li>
                Reactions: <strong>{current().counts.reactions}</strong>
              </li>
              <li>
                Votes: <strong>{current().counts.votes}</strong>
              </li>
              <li>
                Views: <strong>{current().counts.topicViews}</strong>
              </li>
            </ul>

            <label class="form-control gap-1">
              <span class="label-text text-xs font-semibold">
                Type “{current().boardName}” to confirm (case-sensitive)
              </span>
              <input
                type="text"
                class="input input-bordered input-sm w-full"
                value={confirmation()}
                onInput={(event) => setConfirmation(event.currentTarget.value)}
                disabled={props.disabled}
                aria-label="Confirm board name"
              />
            </label>

            <button
              type="button"
              class="btn btn-error btn-sm"
              disabled={
                props.disabled || confirmation() !== current().boardName
              }
              onClick={async () => {
                const purged = await props.onPurge(confirmation(), current());
                if (!purged) {
                  // Any failed purge, especially PURGE_IMPACT_CHANGED, forces
                  // the operator to fetch and review a fresh impact.
                  setImpact(null);
                  setConfirmation("");
                }
              }}
            >
              Permanently delete
            </button>
          </div>
        )}
      </Show>
    </section>
  );
}
