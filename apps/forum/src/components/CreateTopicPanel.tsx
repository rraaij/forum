import { createSignal, Show } from "solid-js";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

interface CreatedTopic {
  id: string;
  slug: string;
}

type TopicParent =
  | {
      categoryId: string;
      subcategoryId?: never;
    }
  | {
      categoryId?: never;
      subcategoryId: string;
    };

interface CreateTopicPanelProps {
  parent: TopicParent;
  onCreated: (topic: CreatedTopic) => void | Promise<void>;
}

export function CreateTopicPanel(props: CreateTopicPanelProps) {
  const session = useSession();
  const user = () => session().data?.user;

  const [isOpen, setIsOpen] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

  const closeEditor = () => {
    // Keep entered text when the editor is merely collapsed so an accidental
    // click does not discard a draft. A successful submission clears it.
    setIsOpen(false);
    setError(null);
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    const trimmedTitle = title().trim();
    const trimmedContent = content().trim();
    if (!trimmedTitle || !trimmedContent) {
      setError("A topic title and opening post are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      /*
       * Submit directly from the browser so `credentials: "include"` in
       * apiFetch sends the active authentication cookie. The previous server
       * function call did not forward that browser cookie to the API.
       */
      const topic = await apiFetch<CreatedTopic>("/topics", {
        method: "POST",
        body: JSON.stringify({
          ...props.parent,
          title: trimmedTitle,
          content: trimmedContent,
        }),
      });

      // Let each route decide whether to invalidate data, navigate, or both.
      await props.onCreated(topic);

      setTitle("");
      setContent("");
      setIsOpen(false);
      setSuccessMessage("Topic created successfully.");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The topic could not be created.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Show when={user()}>
      <div class="space-y-3">
        <div class="flex justify-end">
          <button
            type="button"
            class="btn btn-info btn-sm"
            aria-expanded={isOpen()}
            onClick={() => {
              setIsOpen((current) => !current);
              setError(null);
              setSuccessMessage(null);
            }}
          >
            {isOpen() ? "Close editor" : "Nieuw Topic"}
          </button>
        </div>

        <Show when={successMessage()}>
          {(message) => (
            <div class="alert alert-success py-2 text-sm" role="status">
              <span>{message()}</span>
            </div>
          )}
        </Show>

        <Show when={isOpen()}>
          <div class="rounded-xl border border-base-content/10 bg-base-200/45 p-4">
            <form onSubmit={handleSubmit} class="space-y-3">
              <Show when={error()}>
                {(message) => (
                  <div class="alert alert-error py-2 text-sm" role="alert">
                    <span>{message()}</span>
                  </div>
                )}
              </Show>

              <label class="form-control gap-2">
                <span class="label-text font-semibold">Topic title</span>
                <input
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="Start with a clear and specific title"
                  value={title()}
                  onInput={(event) => setTitle(event.currentTarget.value)}
                  disabled={isSubmitting()}
                  required
                />
              </label>

              <label class="form-control gap-2">
                <span class="label-text font-semibold">Opening post</span>
                <textarea
                  class="textarea textarea-bordered w-full"
                  placeholder="Write your first post..."
                  rows={6}
                  value={content()}
                  onInput={(event) => setContent(event.currentTarget.value)}
                  disabled={isSubmitting()}
                  required
                />
              </label>

              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  onClick={closeEditor}
                  disabled={isSubmitting()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary btn-sm"
                  disabled={isSubmitting()}
                >
                  <Show
                    when={!isSubmitting()}
                    fallback={
                      <>
                        <span class="loading loading-spinner loading-xs" />
                        Creating...
                      </>
                    }
                  >
                    Create Topic
                  </Show>
                </button>
              </div>
            </form>
          </div>
        </Show>
      </div>
    </Show>
  );
}
