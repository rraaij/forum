import { Link } from "@tanstack/solid-router";
import { For } from "solid-js";
import type { BoardSummary } from "@/features/forum-read/api";

const GRID_BADGE_STYLES = [
  "badge-error",
  "badge-warning",
  "badge-success",
  "badge-info",
  "badge-primary",
  "badge-secondary",
  "badge-accent",
];

type ForumGridProps = {
  categorySlug: string;
  boards: BoardSummary[];
};

export default function ForumGrid(props: ForumGridProps) {
  return (
    <section class="card border border-base-content/10 bg-base-100 shadow-md">
      <div class="card-body gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold uppercase tracking-wide">Forumgrid</h2>
          <span class="text-xs font-semibold uppercase text-base-content/60">
            {props.boards.length} subforums
          </span>
        </div>

        <div class="flex flex-wrap gap-2">
          <For each={props.boards}>
            {(board, index) => (
              <Link
                to="/categories/$categorySlug/subcategories/$boardId"
                params={{
                  categorySlug: props.categorySlug,
                  boardId: board.id,
                }}
                class={`badge h-8 min-w-12 border-none text-[11px] font-black tracking-wide text-white ${
                  GRID_BADGE_STYLES[index() % GRID_BADGE_STYLES.length]
                }`}
                title={board.name}
              >
                {board.abbreviation}
              </Link>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}
