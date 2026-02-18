import { A, useParams } from "@solidjs/router";
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

export default function CategoryPage() {
  const params = useParams();
  const [category] = createResource(
    () => params.category,
    (slug) => apiFetch<Category>(`/categories/${slug}`),
  );

  return (
    <Suspense fallback={<span class="loading loading-spinner loading-lg" />}>
      <Show when={category()}>
        {(cat) => (
          <div>
            <div class="breadcrumbs text-sm mb-4">
              <ul>
                <li>
                  <A href="/">Forum</A>
                </li>
                <li>{cat().name}</li>
              </ul>
            </div>
            <h1 class="text-2xl font-bold mb-2">
              <Show when={cat().icon}>
                <span class="mr-2">{cat().icon}</span>
              </Show>
              {cat().name}
            </h1>
            <Show when={cat().description}>
              <p class="text-base-content/60 mb-6">{cat().description}</p>
            </Show>
            <div class="space-y-2">
              <For each={cat().subcategories}>
                {(sub) => (
                  <A
                    href={`/${params.category}/${sub.slug}`}
                    class="card bg-base-100 shadow hover:shadow-md transition-shadow block"
                  >
                    <div class="card-body py-4">
                      <h3 class="font-semibold">{sub.name}</h3>
                      <Show when={sub.description}>
                        <p class="text-sm text-base-content/60">
                          {sub.description}
                        </p>
                      </Show>
                    </div>
                  </A>
                )}
              </For>
            </div>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
