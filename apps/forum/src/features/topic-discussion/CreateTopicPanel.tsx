import { Button, Field } from "@forum/ui";
import { createSignal, createUniqueId, Show } from "solid-js";
import { useSession } from "@/lib/auth-client";
import { type CreatedTopic, createTopic } from "./api";

type CreateTopicPanelProps = {
  boardId: string;
  allowNewTopics: boolean;
  onCreated: (topic: CreatedTopic) => void | Promise<void>;
  class?: string;
};

export function CreateTopicPanel(props: CreateTopicPanelProps) {
  const session = useSession();
  const user = () => session().data?.user;
  const canCreate = () => {
    const role = (user() as { role?: string } | undefined)?.role;
    return props.allowNewTopics || role === "admin" || role === "moderator";
  };
  const editorId = createUniqueId();

  const [isOpen, setIsOpen] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  let trigger: HTMLButtonElement | undefined;
  let titleField: HTMLInputElement | undefined;
  let contentField: HTMLTextAreaElement | undefined;

  const closeEditor = () => {
    // Collapsing preserves the draft; only a successful submission clears it.
    setIsOpen(false);
    setError(null);
    queueMicrotask(() => trigger?.focus());
  };

  const toggleEditor = () => {
    if (isOpen()) {
      closeEditor();
      return;
    }
    setIsOpen(true);
    setError(null);
    setSuccessMessage(null);
    queueMicrotask(() => titleField?.focus());
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const trimmedTitle = title().trim();
    const trimmedContent = content().trim();

    if (!trimmedTitle || !trimmedContent) {
      setError("Vul een titel en een openingsbericht in.");
      queueMicrotask(() => (trimmedTitle ? contentField : titleField)?.focus());
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // This runs in the browser so Better Auth's session cookie is included.
      const topic = await createTopic({
        boardId: props.boardId,
        title: trimmedTitle,
        content: trimmedContent,
      });
      await props.onCreated(topic);
      setTitle("");
      setContent("");
      setIsOpen(false);
      setSuccessMessage("Topic aangemaakt.");
    } catch {
      setError("Het topic kon niet worden aangemaakt. Probeer het nog eens.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Show when={user()}>
      <div class={props.class}>
        <Show
          when={canCreate()}
          fallback={
            <p class="text-sm font-semibold text-brand-700">
              Nieuwe topics zijn in dit forum gesloten.
            </p>
          }
        >
          <div class="flex justify-stretch lg:justify-end">
            <Button
              ref={(element) => {
                trigger = element;
              }}
              variant={isOpen() ? "surface" : "primary"}
              class="w-full lg:w-auto"
              aria-expanded={isOpen()}
              aria-controls={editorId}
              onClick={toggleEditor}
            >
              {isOpen() ? "Sluiten" : "Nieuw topic"}
            </Button>
          </div>

          <Show when={successMessage()}>
            {(message) => (
              <p
                class="mt-3 border-l-[3px] border-success bg-success/10 px-4 py-3 text-sm text-success"
                role="status"
              >
                {message()}
              </p>
            )}
          </Show>

          <Show when={isOpen()}>
            <div
              id={editorId}
              class="mt-4 border-2 border-base-content bg-base-100 p-4 sm:p-5"
            >
              <form
                onSubmit={handleSubmit}
                class="space-y-4"
                aria-label="Nieuw topic"
              >
                <Show when={error()}>
                  {(message) => (
                    <p
                      class="border-l-[3px] border-error bg-error/10 px-4 py-3 text-sm text-error"
                      role="alert"
                    >
                      {message()}
                    </p>
                  )}
                </Show>

                <Field label="Titel" for={`${editorId}-title`} required>
                  <input
                    ref={(element) => {
                      titleField = element;
                    }}
                    id={`${editorId}-title`}
                    name="title"
                    type="text"
                    class="input min-h-11"
                    placeholder="Waar wil je het over hebben?"
                    value={title()}
                    onInput={(event) => setTitle(event.currentTarget.value)}
                    disabled={isSubmitting()}
                    required
                  />
                </Field>

                <Field
                  label="Openingsbericht"
                  for={`${editorId}-content`}
                  required
                >
                  <textarea
                    ref={(element) => {
                      contentField = element;
                    }}
                    id={`${editorId}-content`}
                    name="content"
                    class="textarea min-h-32"
                    placeholder="Geef genoeg context om het gesprek op weg te helpen."
                    value={content()}
                    spellcheck={true}
                    onInput={(event) => setContent(event.currentTarget.value)}
                    disabled={isSubmitting()}
                    required
                  />
                </Field>

                <div class="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting()}
                  >
                    {isSubmitting() ? "Topic plaatsen…" : "Topic plaatsen"}
                  </Button>
                  <Button
                    type="button"
                    variant="surface"
                    onClick={closeEditor}
                    disabled={isSubmitting()}
                  >
                    Annuleren
                  </Button>
                </div>
              </form>
            </div>
          </Show>
        </Show>
      </div>
    </Show>
  );
}
