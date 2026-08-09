import { Button, Field } from "@forum/ui";
import { ArrowRight } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import type { BoardTreeNode } from "@/features/forum-read/api";
import { fetchPurgeImpact, type PurgeImpact } from "./api";

type PurgeBoardDialogProps = {
  board: BoardTreeNode;
  disabled?: boolean;
  onPurge: (confirmationName: string, impact: PurgeImpact) => Promise<boolean>;
};

/*
 * Purge remains a previewed, exact-name-confirmed, race-checked command. The
 * lighter treatment does not weaken any part of that security boundary.
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
        error instanceof Error
          ? error.message
          : "Impact kon niet worden geladen",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section class="mt-5 border-t border-brand-300 pt-4">
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-1.5 text-[12.5px] font-medium text-error hover:underline"
        onClick={loadImpact}
        disabled={props.disabled || loading()}
      >
        {loading() ? (
          "Impact berekenen…"
        ) : (
          <>
            Dit forum verwijderen
            <ArrowRight aria-hidden="true" size={14} strokeWidth={2} />
          </>
        )}
      </button>

      <Show when={previewError()}>
        {(message) => (
          <div class="mt-3 text-sm text-error" role="alert">
            {message()}
          </div>
        )}
      </Show>

      <Show when={impact()}>
        {(current) => (
          <div class="mt-3 space-y-3 border-l-[3px] border-error bg-error/10 p-3">
            <h3 class="font-bold text-error">Forum en inhoud verwijderen</h3>
            <ul class="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] text-brand-800">
              <li>
                Forums: <strong>{current().counts.boards}</strong>
              </li>
              <li>
                Topics: <strong>{current().counts.topics}</strong>
              </li>
              <li>
                Berichten: <strong>{current().counts.posts}</strong>
              </li>
              <li>
                Reacties: <strong>{current().counts.reactions}</strong>
              </li>
              <li>
                Stemmen: <strong>{current().counts.votes}</strong>
              </li>
              <li>
                Weergaven: <strong>{current().counts.topicViews}</strong>
              </li>
            </ul>

            <Field
              label={`Typ “${current().boardName}” om te bevestigen`}
              for="purge-confirmation"
            >
              <input
                id="purge-confirmation"
                name="confirmationName"
                type="text"
                autocomplete="off"
                spellcheck={false}
                class="input min-h-11"
                value={confirmation()}
                onInput={(event) => setConfirmation(event.currentTarget.value)}
                disabled={props.disabled}
              />
            </Field>

            <Button
              type="button"
              variant="error"
              class="min-h-11"
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
              Definitief verwijderen
            </Button>
          </div>
        )}
      </Show>
    </section>
  );
}
