import { For, Show } from "solid-js";
import type { BoardTreeNode } from "@/features/forum-read/api";

type BoardTreeProps = {
  nodes: BoardTreeNode[];
  selectedId: string | null;
  onSelect: (board: BoardTreeNode) => void;
  depth?: number;
};

/*
 * Renders the arbitrary-depth board hierarchy for selection. Depth is only
 * an indentation concern here: the tree comes fully nested from the read
 * model, so this component never reconstructs parent/child relationships.
 */
export function BoardTree(props: BoardTreeProps) {
  const depth = () => props.depth ?? 0;

  return (
    <ul class="space-y-1">
      <For each={props.nodes}>
        {(board) => (
          <li>
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-base-200"
              classList={{
                "bg-base-200 font-semibold": props.selectedId === board.id,
              }}
              style={{ "padding-left": `${depth() * 1.25 + 0.5}rem` }}
              onClick={() => props.onSelect(board)}
              aria-current={props.selectedId === board.id}
            >
              <span class="flex items-center gap-2">
                <Show when={depth() > 0}>
                  <span class="text-info/60" aria-hidden="true">
                    ↳
                  </span>
                </Show>
                <span>{board.name}</span>
                <span class="badge badge-ghost badge-xs">
                  {board.abbreviation}
                </span>
              </span>
              <span class="text-xs text-base-content/60">
                {board.totalTopicCount} topics
              </span>
            </button>

            <Show when={board.children.length > 0}>
              <BoardTree
                nodes={board.children}
                selectedId={props.selectedId}
                onSelect={props.onSelect}
                depth={depth() + 1}
              />
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
}
