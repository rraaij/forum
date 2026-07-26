import { createSignal, For } from "solid-js";
import type { BoardTreeNode } from "@/features/forum-read/api";

type MoveBoardFormProps = {
  board: BoardTreeNode;
  allBoards: BoardTreeNode[];
  disabled?: boolean;
  onMove: (newParentId: string | null, sortOrder: number) => Promise<void>;
};

/** Flattens the tree into "— — Name" options for the parent selector. */
function flatten(
  nodes: BoardTreeNode[],
  depth = 0,
): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flatten(node.children, depth + 1),
  ]);
}

/*
 * Reparenting is a separate command from editing (plan section 5.3), so it
 * gets its own form. Invalid targets (self, descendants) are rejected by
 * the server with a typed BOARD_CYCLE error rather than hidden here — the
 * database trigger is the authority, and the UI reports what it says.
 */
export function MoveBoardForm(props: MoveBoardFormProps) {
  const [parentId, setParentId] = createSignal<string>(
    props.board.parentId ?? "",
  );
  const [sortOrder, setSortOrder] = createSignal(String(props.board.sortOrder));

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    await props.onMove(parentId() || null, Number(sortOrder()) || 0);
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-3">
      <h3 class="font-bold">Move “{props.board.name}”</h3>

      <label class="form-control gap-1">
        <span class="label-text text-xs font-semibold">New parent</span>
        <select
          class="select select-bordered select-sm w-full"
          value={parentId()}
          onChange={(event) => setParentId(event.currentTarget.value)}
          disabled={props.disabled}
          aria-label="New parent board"
        >
          <option value="">(root category)</option>
          <For each={flatten(props.allBoards)}>
            {(option) => <option value={option.id}>{option.label}</option>}
          </For>
        </select>
      </label>

      <label class="form-control gap-1">
        <span class="label-text text-xs font-semibold">Sort order</span>
        <input
          type="number"
          min="0"
          class="input input-bordered input-sm w-full"
          value={sortOrder()}
          onInput={(event) => setSortOrder(event.currentTarget.value)}
          disabled={props.disabled}
        />
      </label>

      <div class="flex justify-end">
        <button
          type="submit"
          class="btn btn-secondary btn-sm"
          disabled={props.disabled}
        >
          Move board
        </button>
      </div>
    </form>
  );
}
