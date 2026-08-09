import { ChevronDown, ChevronUp, CornerDownRight, Pencil } from "lucide-solid";
import { For, Show } from "solid-js";
import type { BoardTreeNode } from "@/features/forum-read/api";

type BoardTreeProps = {
  nodes: BoardTreeNode[];
  selectedId: string | null;
  onSelect: (board: BoardTreeNode) => void;
  onMove: (board: BoardTreeNode, direction: -1 | 1) => void;
  depth?: number;
};

const depthClasses = [
  "sm:pl-[30px]",
  "sm:pl-[62px]",
  "sm:pl-[90px]",
  "sm:pl-[118px]",
  "sm:pl-[146px]",
  "sm:pl-[174px]",
] as const;

const numberFormatter = new Intl.NumberFormat("nl-NL");

/*
 * Native buttons replace the misleading drag grip. Reordering remains scoped
 * to the recursive sibling list supplied by the server-owned hierarchy.
 */
export function BoardTree(props: BoardTreeProps) {
  const depth = () => props.depth ?? 0;
  const depthClass = () =>
    depthClasses[Math.min(depth(), depthClasses.length - 1)];

  return (
    <ul>
      <For each={props.nodes}>
        {(board, index) => {
          const selected = () => props.selectedId === board.id;
          const isCategory = () => depth() === 0;

          return (
            <li>
              <div
                data-board-id={board.id}
                data-board-depth={depth()}
                class="grid min-h-[46px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center border-b border-brand-300 sm:grid-cols-[minmax(0,1fr)_70px_70px_150px]"
                classList={{
                  "bg-base-200": isCategory() && !selected(),
                  "bg-base-100": !isCategory() && !selected(),
                  "border-l-[3px] border-l-secondary bg-flame-100": selected(),
                }}
              >
                <button
                  type="button"
                  class={`col-span-3 flex min-h-11 min-w-0 items-center gap-2 px-4 text-left sm:col-span-1 sm:gap-3 sm:pr-3 ${depthClass()}`}
                  classList={{ "font-bold": isCategory() || selected() }}
                  onClick={() => props.onSelect(board)}
                  aria-current={selected() ? "true" : undefined}
                >
                  <Show
                    when={isCategory()}
                    fallback={
                      <CornerDownRight
                        aria-hidden="true"
                        class="size-4 shrink-0"
                        classList={{
                          "text-brand-300": !selected(),
                          "text-flame-700": selected(),
                        }}
                        strokeWidth={1.75}
                      />
                    }
                  >
                    <span class="inline-flex size-7 shrink-0 items-center justify-center bg-secondary font-extrabold text-secondary-content">
                      {index() + 1}
                    </span>
                  </Show>
                  <span
                    class="min-w-0 break-words text-base-content sm:truncate"
                    classList={{
                      "text-[16px]": depth() === 0,
                      "text-[15px]": depth() === 1,
                      "text-[14.5px]": depth() >= 2,
                    }}
                  >
                    {board.name}
                  </span>
                  <Show when={selected()}>
                    <span class="hidden shrink-0 text-[13px] font-normal text-flame-700 md:inline">
                      — wordt nu bewerkt
                    </span>
                  </Show>
                </button>

                <span
                  data-board-topics
                  class="flex items-center gap-1 px-4 py-2 text-[13.5px] font-normal sm:block sm:px-0 sm:py-0 sm:text-right"
                  classList={{
                    "text-brand-700": !selected(),
                    "text-flame-700": selected(),
                  }}
                >
                  <span class="text-brand-700 sm:hidden">topics</span>
                  {numberFormatter.format(board.totalTopicCount)}
                </span>
                <span
                  data-board-posts
                  class="flex items-center gap-1 px-4 py-2 text-[13.5px] font-normal sm:block sm:px-0 sm:py-0 sm:text-right"
                  classList={{
                    "text-brand-700": !selected(),
                    "text-flame-700": selected(),
                  }}
                >
                  <span class="sm:hidden">posts</span>
                  {numberFormatter.format(board.totalPostCount)}
                </span>
                <div class="col-start-3 row-start-2 flex items-center justify-end pr-2 sm:col-start-auto sm:row-start-auto sm:pr-3">
                  <button
                    type="button"
                    class="inline-flex min-h-11 min-w-11 items-center justify-center text-primary disabled:text-brand-300"
                    aria-label={`Verplaats ${board.name} omhoog`}
                    disabled={index() === 0}
                    onClick={() => props.onMove(board, -1)}
                  >
                    <ChevronUp
                      aria-hidden="true"
                      class="size-4"
                      strokeWidth={2}
                    />
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-11 min-w-11 items-center justify-center text-primary disabled:text-brand-300"
                    aria-label={`Verplaats ${board.name} omlaag`}
                    disabled={index() === props.nodes.length - 1}
                    onClick={() => props.onMove(board, 1)}
                  >
                    <ChevronDown
                      aria-hidden="true"
                      class="size-4"
                      strokeWidth={2}
                    />
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-11 min-w-11 items-center justify-center"
                    classList={{
                      "text-primary": !selected(),
                      "text-flame-700": selected(),
                    }}
                    aria-label={`Bewerk ${board.name}`}
                    onClick={() => props.onSelect(board)}
                  >
                    <Pencil aria-hidden="true" class="size-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <Show when={board.children.length > 0}>
                <BoardTree
                  nodes={board.children}
                  selectedId={props.selectedId}
                  onSelect={props.onSelect}
                  onMove={props.onMove}
                  depth={depth() + 1}
                />
              </Show>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
