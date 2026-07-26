import { createSignal, Show } from "solid-js";
import type { BoardTreeNode, ForumIndex } from "@/features/forum-read/api";
import {
  type BoardFields,
  createBoard,
  moveBoard,
  type PurgeImpact,
  purgeBoard,
  updateBoard,
} from "./api";
import { BoardForm } from "./BoardForm";
import { BoardTree } from "./BoardTree";
import { MoveBoardForm } from "./MoveBoardForm";
import { PurgeBoardDialog } from "./PurgeBoardDialog";
import { createBoardManager } from "./use-board-manager";

type BoardManagerPageProps = {
  index: () => ForumIndex;
};

/** Finds a board anywhere in the nested tree by id. */
function findBoard(
  nodes: BoardTreeNode[],
  boardId: string,
): BoardTreeNode | null {
  for (const node of nodes) {
    if (node.id === boardId) return node;
    const found = findBoard(node.children, boardId);
    if (found) return found;
  }
  return null;
}

export function BoardManagerPage(props: BoardManagerPageProps) {
  const manager = createBoardManager();
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [creatingUnder, setCreatingUnder] = createSignal<string | null>(null);
  const [showCreate, setShowCreate] = createSignal(false);

  const boards = () => props.index().categories;
  // Re-resolve from the latest loader data so the panel updates after each
  // invalidation instead of holding a stale copy of the selected board.
  const selected = () => {
    const id = selectedId();
    return id ? findBoard(boards(), id) : null;
  };

  const handleCreate = async (fields: BoardFields) => {
    const created = await manager.run(
      "create",
      () => createBoard({ ...fields, parentId: creatingUnder() }),
      () => `Created “${fields.name}”`,
    );
    if (created) setShowCreate(false);
  };

  const handleUpdate = async (fields: BoardFields) => {
    const board = selected();
    if (!board) return;
    await manager.run(
      "update",
      () => updateBoard(board.id, fields),
      () => `Updated “${fields.name}”`,
    );
  };

  const handleMove = async (newParentId: string | null, sortOrder: number) => {
    const board = selected();
    if (!board) return;
    await manager.run(
      "move",
      () => moveBoard(board.id, newParentId, sortOrder),
      () => `Moved “${board.name}”`,
    );
  };

  const handlePurge = async (confirmationName: string, impact: PurgeImpact) => {
    const board = selected();
    if (!board) return false;
    const purged = await manager.run(
      "purge",
      () => purgeBoard(board.id, confirmationName, impact.counts),
      (counts) =>
        `Deleted ${counts.boards} board(s), ${counts.topics} topic(s), ${counts.posts} post(s)`,
    );
    if (!purged) return false;
    setSelectedId(null);
    return true;
  };

  return (
    <div class="space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-black">Board management</h1>
          <p class="text-sm text-base-content/65">
            Root boards are shown as categories; nested boards as subforums.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-info btn-sm"
          onClick={() => {
            setCreatingUnder(null);
            setShowCreate(true);
            manager.clearMessages();
          }}
        >
          New root category
        </button>
      </header>

      <Show when={manager.error()}>
        {(message) => (
          <div class="alert alert-error py-2 text-sm" role="alert">
            <span>{message()}</span>
          </div>
        )}
      </Show>
      <Show when={manager.lastResult()}>
        {(message) => (
          <div class="alert alert-success py-2 text-sm" role="status">
            <span>{message()}</span>
          </div>
        )}
      </Show>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section class="card border border-base-content/10 bg-base-100 shadow-sm">
          <div class="card-body gap-3 p-4">
            <h2 class="text-sm font-bold uppercase tracking-wide">Hierarchy</h2>
            <Show
              when={boards().length > 0}
              fallback={
                <p class="text-sm text-base-content/60">
                  No boards yet. Create a root category to start.
                </p>
              }
            >
              <BoardTree
                nodes={boards()}
                selectedId={selectedId()}
                onSelect={(board) => {
                  setSelectedId(board.id);
                  setShowCreate(false);
                  manager.clearMessages();
                }}
              />
            </Show>
          </div>
        </section>

        <section class="space-y-4">
          <Show when={showCreate()}>
            <div class="card border border-base-content/10 bg-base-100 shadow-sm">
              <div class="card-body gap-3 p-4">
                <BoardForm
                  title={
                    creatingUnder()
                      ? `New subforum under “${selected()?.name ?? ""}”`
                      : "New root category"
                  }
                  submitLabel="Create board"
                  disabled={manager.isPending("create")}
                  onSubmit={handleCreate}
                  onCancel={() => setShowCreate(false)}
                />
              </div>
            </div>
          </Show>

          <Show
            when={selected()}
            fallback={
              <p class="text-sm text-base-content/60">
                Select a board to edit, move, or delete it.
              </p>
            }
          >
            {(board) => (
              <div class="space-y-4">
                <div class="card border border-base-content/10 bg-base-100 shadow-sm">
                  <div class="card-body gap-3 p-4">
                    <button
                      type="button"
                      class="btn btn-outline btn-sm self-start"
                      onClick={() => {
                        setCreatingUnder(board().id);
                        setShowCreate(true);
                        manager.clearMessages();
                      }}
                    >
                      Add subforum under “{board().name}”
                    </button>
                  </div>
                </div>

                <div class="card border border-base-content/10 bg-base-100 shadow-sm">
                  <div class="card-body gap-3 p-4">
                    {/* Keyed by id so switching boards resets the inputs. */}
                    <Show when={board().id} keyed>
                      <BoardForm
                        title={`Edit “${board().name}”`}
                        submitLabel="Save changes"
                        initial={{
                          name: board().name,
                          slug: board().slug,
                          abbreviation: board().abbreviation,
                          description: board().description,
                          icon: board().icon,
                          sortOrder: board().sortOrder,
                        }}
                        disabled={manager.isPending("update")}
                        onSubmit={handleUpdate}
                      />
                    </Show>
                  </div>
                </div>

                <div class="card border border-base-content/10 bg-base-100 shadow-sm">
                  <div class="card-body gap-3 p-4">
                    <Show when={board().id} keyed>
                      <MoveBoardForm
                        board={board()}
                        allBoards={boards()}
                        disabled={manager.isPending("move")}
                        onMove={handleMove}
                      />
                    </Show>
                  </div>
                </div>

                <Show when={board().id} keyed>
                  <PurgeBoardDialog
                    board={board()}
                    disabled={manager.isPending("purge")}
                    onPurge={handlePurge}
                  />
                </Show>
              </div>
            )}
          </Show>
        </section>
      </div>
    </div>
  );
}
