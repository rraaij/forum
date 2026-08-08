import { For, Show } from "solid-js";
import type { BoardTreeNode } from "@/features/forum-read/api";

type BoardTreeProps = {
  nodes: BoardTreeNode[];
  selectedId: string | null;
  onSelect: (board: BoardTreeNode) => void;
  depth?: number;
};

const depthClasses = [
  "pl-[30px]",
  "pl-[62px]",
  "pl-[90px]",
  "pl-[118px]",
  "pl-[146px]",
  "pl-[174px]",
] as const;

const numberFormatter = new Intl.NumberFormat("nl-NL");

/*
 * Depth remains a pure indentation concern. The recursive read model is the
 * authority for ancestry; this component never reconstructs relationships.
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
                class="grid min-h-[46px] grid-cols-[minmax(0,1fr)_70px_70px_90px] items-center border-b border-brand-300 text-[13px]"
                classList={{
                  "bg-base-200": isCategory() && !selected(),
                  "bg-base-100": !isCategory() && !selected(),
                  "border-l-[3px] border-l-secondary bg-flame-100 text-flame-700":
                    selected(),
                }}
              >
                <button
                  type="button"
                  class={`flex min-h-[46px] min-w-0 items-center gap-3 pr-3 text-left ${depthClass()}`}
                  classList={{ "font-extrabold": isCategory() || selected() }}
                  onClick={() => props.onSelect(board)}
                  aria-current={selected() ? "true" : undefined}
                >
                  <Show
                    when={isCategory()}
                    fallback={
                      <span class="shrink-0 text-brand-300" aria-hidden="true">
                        └
                      </span>
                    }
                  >
                    <span class="text-brand-500" aria-hidden="true">
                      ⠿
                    </span>
                    <span class="inline-flex size-7 shrink-0 items-center justify-center bg-secondary font-extrabold text-secondary-content">
                      {index() + 1}
                    </span>
                  </Show>
                  <span class="truncate">{board.name}</span>
                  <Show when={selected()}>
                    <span class="hidden shrink-0 text-[11.5px] font-medium sm:inline">
                      — wordt nu bewerkt
                    </span>
                  </Show>
                </button>

                <span class="text-right font-semibold">
                  {numberFormatter.format(board.totalTopicCount)}
                </span>
                <span class="text-right text-brand-700">—</span>
                <button
                  type="button"
                  class="min-h-9 pr-5 text-right font-medium text-primary hover:underline"
                  onClick={() => props.onSelect(board)}
                >
                  bewerken
                </button>
              </div>

              <Show when={board.children.length > 0}>
                <BoardTree
                  nodes={board.children}
                  selectedId={props.selectedId}
                  onSelect={props.onSelect}
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
