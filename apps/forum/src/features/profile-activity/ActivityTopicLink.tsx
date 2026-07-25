import { Link } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { UserPostActivity } from "@/types/forum";

/*
 * LEGACY profile activity link, moved out of the route file unchanged so
 * the profile page could be rebuilt around the profile-edit feature.
 * Phase 7 replaces it with backend-supplied canonical route params.
 */
export function ActivityTopicLink(props: { activity: UserPostActivity }) {
  const [previewPosition, setPreviewPosition] = createSignal<{
    top: number;
    left: number;
  }>();

  const showPreview = (trigger: HTMLElement) => {
    const bounds = trigger.getBoundingClientRect();
    const previewWidth = 384;
    const renderedWidth = Math.min(previewWidth, window.innerWidth - 24);
    const estimatedHeight = 220;
    const left = Math.max(
      12,
      Math.min(bounds.left, window.innerWidth - renderedWidth - 12),
    );
    const top =
      bounds.bottom + estimatedHeight + 8 > window.innerHeight
        ? Math.max(12, bounds.top - estimatedHeight - 8)
        : bounds.bottom + 8;

    setPreviewPosition({ top, left });
  };

  return (
    <>
      <Show
        when={props.activity.categorySlug}
        fallback={
          <button
            type="button"
            class="font-semibold"
            onMouseEnter={(event) => showPreview(event.currentTarget)}
            onMouseLeave={() => setPreviewPosition(undefined)}
            onFocus={(event) => showPreview(event.currentTarget)}
            onBlur={() => setPreviewPosition(undefined)}
            aria-describedby={`post-preview-${props.activity.postId}`}
          >
            {props.activity.topicTitle}
          </button>
        }
      >
        {(categorySlug) => (
          /*
           * TEMPORARY bridge until Phase 7 moves profile activity onto the
           * ProfileActivity module. The legacy endpoint still returns
           * category/subcategory slugs, but topic slugs are globally unique
           * and the topic loader resolves by slug alone, so the canonical
           * root-topic path renders the right topic. Phase 7 replaces this
           * with backend-supplied canonical route params.
           */
          <Link
            to="/categories/$categorySlug/topics/$topicSlug"
            params={{
              categorySlug: categorySlug(),
              topicSlug: props.activity.topicSlug,
            }}
            class="font-semibold text-info hover:underline"
            onMouseEnter={(event) => showPreview(event.currentTarget)}
            onMouseLeave={() => setPreviewPosition(undefined)}
            onFocus={(event) => showPreview(event.currentTarget)}
            onBlur={() => setPreviewPosition(undefined)}
            aria-describedby={`post-preview-${props.activity.postId}`}
          >
            {props.activity.topicTitle}
          </Link>
        )}
      </Show>

      <Show when={previewPosition()}>
        {(position) => (
          <Portal>
            {/*
             * Portaling keeps the hover modal above the table's horizontal
             * scroller. Pointer events remain disabled so it cannot trap the
             * cursor or interfere with clicking the topic link beneath it.
             */}
            <aside
              id={`post-preview-${props.activity.postId}`}
              role="tooltip"
              class="pointer-events-none fixed z-50 w-96 max-w-[calc(100vw-1.5rem)] rounded-sm border border-base-content/15 bg-base-100 p-4 text-left shadow-2xl"
              style={{
                top: `${position().top}px`,
                left: `${position().left}px`,
              }}
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <strong class="text-sm">{props.activity.topicTitle}</strong>
                <span class="badge badge-ghost badge-sm">
                  {props.activity.isTopicStart ? "Opening post" : "Reply"}
                </span>
              </div>
              <p
                classList={{
                  "max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed": true,
                  "italic text-base-content/55": props.activity.postDeleted,
                  "text-base-content/80": !props.activity.postDeleted,
                }}
              >
                {props.activity.postDeleted
                  ? "This post has been deleted."
                  : props.activity.postContent}
              </p>
            </aside>
          </Portal>
        )}
      </Show>
    </>
  );
}
