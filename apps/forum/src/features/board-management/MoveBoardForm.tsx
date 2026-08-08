import { Button, Field } from "@forum/ui";
import { createSignal, For } from "solid-js";
import type { BoardTreeNode } from "@/features/forum-read/api";

type MoveBoardFormProps = {
  board: BoardTreeNode;
  allBoards: BoardTreeNode[];
  disabled?: boolean;
  onMove: (newParentId: string | null, sortOrder: number) => Promise<void>;
};

/** Flattens the tree into indented options for the parent selector. */
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
 * Reparenting remains a separate server command from editing. Invalid targets
 * stay visible because the database-backed domain rule is the authority.
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
      <h3 class="text-[16px] font-semibold">Plaatsing</h3>

      <Field label="Bovenliggend forum" for="board-parent">
        <select
          id="board-parent"
          class="select h-[38px] w-full rounded-none border-brand-300 bg-base-100"
          value={parentId()}
          onChange={(event) => setParentId(event.currentTarget.value)}
          disabled={props.disabled}
          aria-label="Bovenliggend forum"
        >
          <option value="">Hoofdcategorie</option>
          <For each={flatten(props.allBoards)}>
            {(option) => <option value={option.id}>{option.label}</option>}
          </For>
        </select>
      </Field>

      <Field label="Volgorde binnen het forum" for="move-sort-order">
        <input
          id="move-sort-order"
          type="number"
          min="0"
          class="input h-[38px]"
          value={sortOrder()}
          onInput={(event) => setSortOrder(event.currentTarget.value)}
          disabled={props.disabled}
        />
      </Field>

      <Button
        type="submit"
        variant="surface"
        size="sm"
        loading={props.disabled}
      >
        Verplaatsen
      </Button>
    </form>
  );
}
