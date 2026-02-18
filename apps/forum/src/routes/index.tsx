import { A } from "@solidjs/router";
import { createResource, For, Show, Suspense } from "solid-js";
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

export default function Home() {
  const [categories] = createResource(() =>
    apiFetch<Category[]>("/categories"),
  );

  return (
    <div>
      <h1 class="text-2xl font-bold mb-6">Forum</h1>
      <Suspense fallback={<span class="loading loading-spinner loading-lg" />}>
        <Show
          when={categories()}
          fallback={<p class="text-base-content/60">No categories yet.</p>}
        >
          {(cats) => (
            <div class="space-y-4">
              <For each={cats()}>
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
                        <p class="text-base-content/60">
                          {category.description}
                        </p>
                      </Show>
                      <div class="mt-2">
                        <For each={category.subcategories}>
                          {(sub) => (
                            <A
                              href={`/${category.slug}/${sub.slug}`}
                              class="btn btn-ghost btn-sm"
                            >
                              {sub.name}
                            </A>
                          )}
                        </For>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
