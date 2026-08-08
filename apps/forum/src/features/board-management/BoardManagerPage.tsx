import { Button, EmptyState } from "@forum/ui";
import { createMemo, createSignal, Show } from "solid-js";
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

function countDescendants(nodes: BoardTreeNode[]): number {
  return nodes.reduce(
    (total, node) =>
      total + node.children.length + countDescendants(node.children),
    0,
  );
}

export function BoardManagerPage(props: BoardManagerPageProps) {
  const manager = createBoardManager();
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [creatingUnder, setCreatingUnder] = createSignal<string | null>(null);
  const [showCreate, setShowCreate] = createSignal(false);

  const boards = () => props.index().categories;
  const subforumCount = createMemo(() => countDescendants(boards()));
  const topicCount = createMemo(() =>
    boards().reduce((total, board) => total + board.totalTopicCount, 0),
  );

  // Re-resolve from the latest loader data so the panel updates after each
  // invalidation instead of holding a stale copy of the selected board.
  const selected = () => {
    const id = selectedId();
    return id ? findBoard(boards(), id) : null;
  };

  const openCreate = (parentId: string | null) => {
    setCreatingUnder(parentId);
    setShowCreate(true);
    manager.clearMessages();
  };

  const handleCreate = async (fields: BoardFields) => {
    const created = await manager.run(
      "create",
      () => createBoard({ ...fields, parentId: creatingUnder() }),
      () => `“${fields.name}” aangemaakt`,
    );
    if (created) setShowCreate(false);
  };

  const handleUpdate = async (fields: BoardFields) => {
    const board = selected();
    if (!board) return;
    await manager.run(
      "update",
      () => updateBoard(board.id, fields),
      () => `“${fields.name}” bijgewerkt`,
    );
  };

  const handleMove = async (newParentId: string | null, sortOrder: number) => {
    const board = selected();
    if (!board) return;
    await manager.run(
      "move",
      () => moveBoard(board.id, newParentId, sortOrder),
      () => `“${board.name}” verplaatst`,
    );
  };

  const handlePurge = async (confirmationName: string, impact: PurgeImpact) => {
    const board = selected();
    if (!board) return false;
    const purged = await manager.run(
      "purge",
      () => purgeBoard(board.id, confirmationName, impact.counts),
      (counts) =>
        `${counts.boards} forum(s), ${counts.topics} topic(s) en ${counts.posts} bericht(en) verwijderd`,
    );
    if (!purged) return false;
    setSelectedId(null);
    return true;
  };

  return (
    <div class="-mx-4 -my-2 bg-base-200 text-base-content">
      <header class="flex flex-wrap items-end justify-between gap-5 border-b-2 border-base-content px-6 py-7 sm:px-10">
        <div>
          <p class="text-[13.5px] text-brand-700">
            {boards().length}{" "}
            {boards().length === 1 ? "categorie" : "categorieën"}
            {" · "}
            {subforumCount()} {subforumCount() === 1 ? "subforum" : "subforums"}
            {" · "}
            {new Intl.NumberFormat("nl-NL").format(topicCount())} topics
          </p>
          <h1 class="mt-1 text-[42px] leading-none font-semibold">
            Forums beheren
          </h1>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button variant="surface">Volgorde opslaan</Button>
          <Button variant="primary" onClick={() => openCreate(null)}>
            Nieuw forum
          </Button>
        </div>
      </header>

      <Show when={manager.error()}>
        {(message) => (
          <div
            class="border-b border-error bg-error/10 px-6 py-3 text-sm text-error sm:px-10"
            role="alert"
          >
            {message()}
          </div>
        )}
      </Show>
      <Show when={manager.lastResult()}>
        {(message) => (
          <div
            class="border-b border-success bg-success/10 px-6 py-3 text-sm text-success sm:px-10"
            role="status"
          >
            {message()}
          </div>
        )}
      </Show>

      <div class="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <section class="min-w-0 bg-base-100" aria-label="Forumhiërarchie">
          <div class="grid grid-cols-[minmax(0,1fr)_70px_70px_90px] border-b border-brand-300 px-0 py-3 text-[11.5px] font-bold tracking-[0.06em] text-brand-700 uppercase">
            <span class="pl-[30px]">Naam</span>
            <span class="text-right">Topics</span>
            <span class="text-right">Posts</span>
            <span class="text-right pr-5">Acties</span>
          </div>

          <Show
            when={boards().length > 0}
            fallback={
              <EmptyState
                class="border-0"
                kicker="Forums"
                title="Nog geen forums"
                description="Maak het eerste forum aan om de hiërarchie op te bouwen."
              />
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
        </section>

        <aside class="border-t-2 border-base-content bg-base-300 px-6 py-6 lg:border-t-0 lg:border-l-2">
          <Show
            when={showCreate()}
            fallback={
              <Show
                when={selected()}
                fallback={
                  <div class="pt-1">
                    <p class="text-[11.5px] font-bold tracking-[0.06em] text-flame-700 uppercase">
                      Bewerken
                    </p>
                    <h2 class="mt-1 text-[22px] font-semibold">
                      Kies een forum
                    </h2>
                    <p class="mt-3 text-sm leading-relaxed text-brand-800">
                      Selecteer links een forum om het te bewerken, verplaatsen
                      of verwijderen.
                    </p>
                  </div>
                }
              >
                {(board) => (
                  <div>
                    <p class="text-[11.5px] font-bold tracking-[0.06em] text-flame-700 uppercase">
                      Bewerken
                    </p>
                    <h2 class="mt-1 text-[22px] font-semibold">
                      {board().name}
                    </h2>

                    <div class="mt-4">
                      {/* Keyed by id so switching boards resets every form. */}
                      <Show when={board().id} keyed>
                        <BoardForm
                          title={`Bewerk “${board().name}”`}
                          showTitle={false}
                          submitLabel="Opslaan"
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

                    <div class="mt-5 border-t border-brand-300 pt-4">
                      <Show when={board().id} keyed>
                        <MoveBoardForm
                          board={board()}
                          allBoards={boards()}
                          disabled={manager.isPending("move")}
                          onMove={handleMove}
                        />
                      </Show>
                    </div>

                    <div class="mt-5 border-t border-brand-300 pt-4">
                      <Button
                        variant="surface"
                        size="sm"
                        class="w-full"
                        onClick={() => openCreate(board().id)}
                      >
                        Subforum toevoegen
                      </Button>
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
            }
          >
            <div>
              <p class="text-[11.5px] font-bold tracking-[0.06em] text-flame-700 uppercase">
                Nieuw forum
              </p>
              <div class="mt-1">
                <BoardForm
                  title={
                    creatingUnder()
                      ? `Nieuw subforum onder “${selected()?.name ?? ""}”`
                      : "Nieuw forum"
                  }
                  submitLabel="Forum aanmaken"
                  disabled={manager.isPending("create")}
                  onSubmit={handleCreate}
                  onCancel={() => setShowCreate(false)}
                />
              </div>
            </div>
          </Show>
        </aside>
      </div>
    </div>
  );
}
