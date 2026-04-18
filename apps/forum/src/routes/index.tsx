import { createFileRoute, Link } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { For, Show } from "solid-js";
import { apiFetch } from "@/lib/api";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  subcategories: Subcategory[];
}

const fetchCategories = createServerFn({ method: "GET" }).handler(async () => {
  return await apiFetch<Category[]>("/categories");
});

export const Route = createFileRoute("/")({
  loader: () => fetchCategories(),
  component: Home,
});

function Home() {
  const categories = Route.useLoaderData();

  return (
    <div>
      <h1 class="mb-6 text-2xl font-bold">Forum</h1>
      <Show
        when={(categories()?.length ?? 0) > 0}
        fallback={<p class="text-base-content/60">No categories yet.</p>}
      >
        <div class="space-y-4">
          <For each={categories()}>
            {(category) => (
              <div class="card bg-base-100 shadow">
                <div class="card-body">
                  <h2 class="card-title">
                    <Show when={category.icon}>
                      <span>{category.icon}</span>
                    </Show>
                    {category.name}
                  </h2>
                  <Show when={category.description}>
                    <p class="text-base-content/60">{category.description}</p>
                  </Show>
                  <div class="mt-2">
                    <For each={category.subcategories}>
                      {(sub) => (
                        <Link
                          to="/$category/$sub"
                          params={{ category: category.slug, sub: sub.slug }}
                          class="btn btn-ghost btn-sm"
                        >
                          {sub.name}
                        </Link>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
