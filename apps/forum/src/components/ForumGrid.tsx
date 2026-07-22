import { Link } from "@tanstack/solid-router";
import { For } from "solid-js";
import type { Category } from "@/types/forum";

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
  category: Category;
};

export default function ForumGrid(props: ForumGridProps) {
  return (
    <section class="card border border-base-content/10 bg-base-100 shadow-md">
      <div class="card-body gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold uppercase tracking-wide">Forumgrid</h2>
          <span class="text-xs font-semibold uppercase text-base-content/60">
            {props.category.subcategories.length} subforums
          </span>
        </div>

        <div class="flex flex-wrap gap-2">
          <For each={props.category.subcategories}>
            {(sub, index) => (
              <Link
                to="/$category/$sub"
                params={{ category: props.category.slug, sub: sub.slug }}
                class={`badge h-8 min-w-12 border-none text-[11px] font-black tracking-wide text-white ${
                  GRID_BADGE_STYLES[index() % GRID_BADGE_STYLES.length]
                }`}
                title={sub.name}
              >
                {sub.abbreviation}
              </Link>
            )}
          </For>
        </div>
      </div>
    </section>
  );
}
