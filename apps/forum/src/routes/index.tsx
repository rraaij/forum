import { createFileRoute, Link } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { createSignal, For, Show } from "solid-js";
import { apiFetch } from "@/lib/api";
import type { Category } from "@/types/forum";

const fetchCategories = createServerFn({ method: "GET" }).handler(async () => {
  return await apiFetch<Category[]>("/categories");
});

export const Route = createFileRoute("/")({
  loader: () => fetchCategories(),
  component: Home,
});

function Home() {
  const categories = Route.useLoaderData();

  // Categories start collapsed so the root page remains easy to scan. A Set
  // lets each category expand independently without changing the loaded data.
  const [expandedCategoryIds, setExpandedCategoryIds] = createSignal(
    new Set<string>(),
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryIds((currentIds) => {
      // Create a new Set so Solid sees a new value and updates the matching
      // category card.
      const nextIds = new Set(currentIds);
      if (nextIds.has(categoryId)) {
        nextIds.delete(categoryId);
      } else {
        nextIds.add(categoryId);
      }
      return nextIds;
    });
  };

  return (
    <div>
      <h1 class="mb-6 text-2xl font-bold">Forum Categories</h1>
      <Show
        when={(categories()?.length ?? 0) > 0}
        fallback={<p class="text-base-content/60">No categories yet.</p>}
      >
        <div class="space-y-2">
          <For each={categories()}>
            {(category) => {
              const hasSubcategories = () => category.subcategories.length > 0;
              const isExpanded = () => expandedCategoryIds().has(category.id);
              const contentId = `category-children-${category.id}`;

              return (
                <div class="card bg-base-100 shadow">
                  <div class="card-body p-4 py-2">
                    {/* The header is always visible. Keep the expand control
                        separate from the link so users can either reveal the
                        hierarchy or navigate directly to the category board. */}
                    <div class="flex items-center gap-2">
                      <Show when={hasSubcategories()}>
                        <button
                          type="button"
                          class="btn btn-circle btn-ghost btn-sm"
                          aria-label={
                            isExpanded()
                              ? `Collapse ${category.name}`
                              : `Expand ${category.name}`
                          }
                          aria-expanded={isExpanded()}
                          aria-controls={contentId}
                          onClick={() => toggleCategory(category.id)}
                        >
                          <span
                            class="transition-transform duration-300 ease-out motion-reduce:transition-none"
                            classList={{ "rotate-90": isExpanded() }}
                            aria-hidden="true"
                          >
                            ▶
                          </span>
                        </button>
                      </Show>

                      <h2 class="card-title">
                        {/* Categories have their own board page because topics
                            can belong directly to a category. */}
                        <Link
                          to="/$category"
                          params={{ category: category.slug }}
                          class="inline-flex items-center gap-2 text-info hover:underline"
                        >
                          <Show when={category.icon}>
                            <span>{category.icon}</span>
                          </Show>
                          {category.name}
                          <span class="badge badge-ghost badge-sm font-normal">
                            {category.topicCount}{" "}
                            {category.topicCount === 1 ? "topic" : "topics"}
                          </span>
                        </Link>
                      </h2>
                    </div>

                    <Show when={hasSubcategories()}>
                      {/* Keep the panel mounted so both expansion and collapse
                          can animate. The inert state prevents hidden links
                          from receiving keyboard focus. */}
                      <div
                        id={contentId}
                        class="category-collapse"
                        data-expanded={isExpanded()}
                        aria-hidden={!isExpanded()}
                        inert={!isExpanded()}
                      >
                        <div class="category-collapse-content">
                          <Show when={category.description}>
                            <p class="mt-2 text-base-content/60">
                              {category.description}
                            </p>
                          </Show>

                          <div class="mt-4 space-y-2">
                            {/* Render only root subcategories at this level.
                                Their children are grouped underneath instead
                                of appearing as unrelated boards. */}
                            <For
                              each={category.subcategories.filter(
                                (sub) => !sub.parentSubcategoryId,
                              )}
                            >
                              {(sub) => {
                                // The API returns a flat collection, so derive
                                // the second tier from the parent reference.
                                const children = () =>
                                  category.subcategories.filter(
                                    (child) =>
                                      child.parentSubcategoryId === sub.id,
                                  );

                                return (
                                  <div class="rounded-lg border border-base-300 bg-base-100">
                                    <Link
                                      to="/$category/$sub"
                                      params={{
                                        category: category.slug,
                                        sub: sub.slug,
                                      }}
                                      class="flex px-3 py-2 text-sm font-semibold text-info hover:bg-base-200/60 hover:underline"
                                    >
                                      <span class="flex flex-1 items-center justify-between gap-3">
                                        <span>{sub.name}</span>
                                        <span class="badge badge-ghost badge-sm font-normal text-base-content/65">
                                          {sub.topicCount}{" "}
                                          {sub.topicCount === 1
                                            ? "topic"
                                            : "topics"}
                                        </span>
                                      </span>
                                    </Link>

                                    <Show when={children().length > 0}>
                                      {/* The inset and vertical rule visually
                                          attach second-tier boards to their
                                          parent board. */}
                                      <div class="mb-2 ml-5 mr-2 space-y-1 border-l-2 border-info/30 pl-3">
                                        <For each={children()}>
                                          {(child) => (
                                            <Link
                                              to="/$category/$sub"
                                              params={{
                                                category: category.slug,
                                                sub: child.slug,
                                              }}
                                              class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-base-content/75 hover:bg-base-200 hover:text-info"
                                            >
                                              <span
                                                class="text-info/60"
                                                aria-hidden="true"
                                              >
                                                ↳
                                              </span>
                                              <span class="flex flex-1 items-center justify-between gap-3">
                                                <span>{child.name}</span>
                                                <span class="badge badge-ghost badge-sm font-normal">
                                                  {child.topicCount}{" "}
                                                  {child.topicCount === 1
                                                    ? "topic"
                                                    : "topics"}
                                                </span>
                                              </span>
                                            </Link>
                                          )}
                                        </For>
                                      </div>
                                    </Show>
                                  </div>
                                );
                              }}
                            </For>
                          </div>
                        </div>
                      </div>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
