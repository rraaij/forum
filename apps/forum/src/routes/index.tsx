import { createFileRoute, Link } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { type BoardTreeNode, fetchForumIndex } from "@/features/forum-read/api";

export const Route = createFileRoute("/")({
  // One page-oriented request; the loader may run on server or client.
  loader: () => fetchForumIndex(),
  component: Home,
});

function topicCountBadge(count: number) {
  return (
    <span class="badge badge-ghost badge-sm font-normal">
      {count} {count === 1 ? "topic" : "topics"}
    </span>
  );
}

function Home() {
  const index = Route.useLoaderData();
  const categories = () => index().categories;

  // Categories start collapsed so the root page remains easy to scan. A Set
  // lets each category expand independently without changing loaded data.
  const [expandedCategoryIds, setExpandedCategoryIds] = createSignal(
    new Set<string>(),
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryIds((currentIds) => {
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
        when={categories().length > 0}
        fallback={<p class="text-base-content/60">No categories yet.</p>}
      >
        <div class="space-y-2">
          <For each={categories()}>
            {(category) => {
              const hasChildren = () => category.children.length > 0;
              const isExpanded = () => expandedCategoryIds().has(category.id);
              const contentId = `category-children-${category.id}`;

              return (
                <div class="card bg-base-100 shadow">
                  <div class="card-body p-4 py-2">
                    <div class="flex items-center gap-2">
                      <Show when={hasChildren()}>
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
                        <Link
                          to="/categories/$categorySlug"
                          params={{ categorySlug: category.slug }}
                          class="inline-flex items-center gap-2 text-info hover:underline"
                        >
                          <Show when={category.icon}>
                            <span>{category.icon}</span>
                          </Show>
                          {category.name}
                          {topicCountBadge(category.totalTopicCount)}
                        </Link>
                      </h2>
                    </div>

                    <Show when={hasChildren()}>
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
                            <For each={category.children}>
                              {(board: BoardTreeNode) => (
                                <div class="rounded-sm border border-base-300 bg-base-100">
                                  <Link
                                    to="/categories/$categorySlug/subcategories/$boardId"
                                    params={{
                                      categorySlug: category.slug,
                                      boardId: board.id,
                                    }}
                                    class="flex px-3 py-2 text-sm font-semibold text-info hover:bg-base-200/60 hover:underline"
                                  >
                                    <span class="flex flex-1 items-center justify-between gap-3">
                                      <span>{board.name}</span>
                                      {topicCountBadge(board.totalTopicCount)}
                                    </span>
                                  </Link>

                                  <Show when={board.children.length > 0}>
                                    {/* Deeper boards attach visually to their
                                        parent; arbitrary depth is browsable
                                        from each board page itself. */}
                                    <div class="mb-2 ml-5 mr-2 space-y-1 border-l-2 border-info/30 pl-3">
                                      <For each={board.children}>
                                        {(child: BoardTreeNode) => (
                                          <Link
                                            to="/categories/$categorySlug/subcategories/$boardId"
                                            params={{
                                              categorySlug: category.slug,
                                              boardId: child.id,
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
                                              {topicCountBadge(
                                                child.totalTopicCount,
                                              )}
                                            </span>
                                          </Link>
                                        )}
                                      </For>
                                    </div>
                                  </Show>
                                </div>
                              )}
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
