import { Tag } from "@forum/ui";
import { Link } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { topicLinkProps } from "@/features/forum-read/topic-link";
import type { ProfileActivityItem } from "./api";

/*
 * Topic link with a hover preview of the post. The destination comes from
 * the backend's canonical route params (plan section 7.1) — this component
 * never derives a URL from slugs.
 */
export function ActivityTopicLink(props: { activity: ProfileActivityItem }) {
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

  const previewHandlers = () => ({
    onMouseEnter: (event: { currentTarget: HTMLElement }) =>
      showPreview(event.currentTarget),
    onMouseLeave: () => setPreviewPosition(undefined),
    onFocus: (event: { currentTarget: HTMLElement }) =>
      showPreview(event.currentTarget),
    onBlur: () => setPreviewPosition(undefined),
    "aria-describedby": `post-preview-${props.activity.postId}`,
  });

  return (
    <>
      <Show
        when={props.activity.routeParams}
        fallback={
          /*
           * The backend could not resolve the topic's board (it was purged
           * while activity was being read), so there is no canonical URL.
           * The row stays in the author's record, presented without a link.
           */
          <span
            class="inline-flex min-h-11 min-w-0 items-center font-semibold transition-colors [overflow-wrap:anywhere] group-hover:text-primary"
            tabindex="0"
            {...previewHandlers()}
          >
            {props.activity.topicTitle}
          </span>
        }
      >
        {(routeParams) => (
          <Link
            {...topicLinkProps(routeParams())}
            class="inline-flex min-h-11 min-w-0 items-center font-semibold text-base-content transition-colors [overflow-wrap:anywhere] group-hover:text-primary hover:underline"
            {...previewHandlers()}
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
              class="pointer-events-none fixed z-50 w-96 max-w-[calc(100vw-1.5rem)] border-2 border-base-content bg-base-100 p-4 text-left"
              style={{
                top: `${position().top}px`,
                left: `${position().left}px`,
              }}
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <strong class="text-sm">{props.activity.topicTitle}</strong>
                <Tag>
                  {props.activity.postKind === "opening" ? "Topic" : "Reactie"}
                </Tag>
              </div>
              <p
                classList={{
                  "max-h-72 overflow-y-auto whitespace-pre-wrap text-[14px] leading-[1.55]": true,
                  "italic text-brand-700": props.activity.isDeleted,
                  "text-brand-800": !props.activity.isDeleted,
                }}
              >
                {props.activity.isDeleted
                  ? "Dit bericht is verwijderd."
                  : props.activity.postContent}
              </p>
            </aside>
          </Portal>
        )}
      </Show>
    </>
  );
}
