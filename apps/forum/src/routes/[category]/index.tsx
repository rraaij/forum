import { A, useParams } from "@solidjs/router";
import { createResource, For, Show, Suspense } from "solid-js";
import ForumPageHeader from "@/components/forum-page-header";
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

interface TopicSummary {
  id: string;
  postCount: number;
  lastPostAt: string | null;
  createdAt: string;
}

interface SubcategoryMeta {
  topicCount: number;
  replyCount: number;
  lastActivityAt: string | null;
}

// This fixed palette recreates the colorful "forumgrid" badges from the reference.
const GRID_BADGE_STYLES = [
  "badge-error",
  "badge-warning",
  "badge-success",
  "badge-info",
  "badge-primary",
  "badge-secondary",
  "badge-accent",
];

export default function CategoryPage() {
  const params = useParams();
  const [category] = createResource(
    () => params.category,
    (slug) => apiFetch<Category>(`/categories/${slug}`),
  );

  // We fetch per-subcategory topic metadata so table columns can stay close to classic forum layouts.
  const [subcategoryMeta] = createResource(
    () => category(),
    async (cat) => {
      if (!cat) {
        return {} as Record<string, SubcategoryMeta>;
      }

      const entries = await Promise.all(
        cat.subcategories.map(async (sub) => {
          const topics = await apiFetch<TopicSummary[]>(
            `/topics?subcategoryId=${sub.id}`,
          );

          const replyCount = topics.reduce(
            (sum, topic) => sum + Math.max(0, topic.postCount - 1),
            0,
          );

          // We keep "last activity" resilient by falling back to createdAt when lastPostAt is missing.
          const lastActivityAt = topics.reduce<string | null>(
            (latest, topic) => {
              const candidate = topic.lastPostAt ?? topic.createdAt;
              if (!latest) return candidate;
              return new Date(candidate) > new Date(latest)
                ? candidate
                : latest;
            },
            null,
          );

          return [
            sub.id,
            {
              topicCount: topics.length,
              replyCount,
              lastActivityAt,
            } satisfies SubcategoryMeta,
          ] as const;
        }),
      );

      return Object.fromEntries(entries);
    },
  );

  // Helper keeps date rendering identical across subforum rows.
  const formatTimestamp = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "No activity yet";

  return (
    <Suspense fallback={<span class="loading loading-spinner loading-lg" />}>
      <Show when={category()}>
        {(cat) => (
          <div class="space-y-6">
            {/* The hero replicates the atmospheric top section from the provided page-header reference. */}
            <ForumPageHeader
              forumCode={cat().slug.toUpperCase()}
              title={`${cat().name}`}
              description={
                cat().description ??
                "Browse subforums, discover active discussions, and jump straight into trending topics."
              }
              stats={[
                {
                  label: "subforums",
                  value: String(cat().subcategories.length),
                },
              ]}
              tags={cat()
                .subcategories.slice(0, 10)
                .map((sub) => sub.slug.toUpperCase())}
            />

            {/* Breadcrumbs stay visible under the header for fast back-navigation. */}
            <div class="breadcrumbs text-sm">
              <ul>
                <li>
                  <A href="/">Forum</A>
                </li>
                <li>{cat().name}</li>
              </ul>
            </div>

            {/* Forum grid panel emulates the colorful abbreviation blocks from the screenshot. */}
            <section class="card border border-base-content/10 bg-base-100 shadow-md">
              <div class="card-body gap-4">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-bold uppercase tracking-wide">
                    Forumgrid
                  </h2>
                  <span class="text-xs font-semibold uppercase text-base-content/60">
                    {cat().subcategories.length} subforums
                  </span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <For each={cat().subcategories}>
                    {(sub, index) => (
                      <A
                        href={`/${params.category}/${sub.slug}`}
                        class={`badge h-8 min-w-12 border-none text-[11px] font-black tracking-wide text-white ${
                          GRID_BADGE_STYLES[index() % GRID_BADGE_STYLES.length]
                        }`}
                        title={sub.name}
                      >
                        {sub.slug.slice(0, 4).toUpperCase()}
                      </A>
                    )}
                  </For>
                </div>
              </div>
            </section>

            {/* Main subforum table keeps the same information hierarchy as the inspiration. */}
            <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
              <div class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th>Subforums binnen {cat().name}</th>
                      <th class="text-right">Topics</th>
                      <th class="text-right">Replies</th>
                      <th>Laatste reactie</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={cat().subcategories}>
                      {(sub) => {
                        const meta = () => subcategoryMeta()?.[sub.id];
                        return (
                          <tr class="align-top">
                            <td>
                              <A
                                href={`/${params.category}/${sub.slug}`}
                                class="text-base font-semibold text-info hover:underline"
                              >
                                <Show when={cat().icon}>
                                  <span class="mr-2">{cat().icon}</span>
                                </Show>
                                {sub.name}
                              </A>
                              <Show when={sub.description}>
                                <p class="mt-1 text-sm text-base-content/60">
                                  {sub.description}
                                </p>
                              </Show>
                            </td>
                            <td class="text-right font-semibold">
                              {meta()?.topicCount ?? "…"}
                            </td>
                            <td class="text-right">
                              {meta()?.replyCount ?? "…"}
                            </td>
                            <td class="text-sm text-base-content/70">
                              {formatTimestamp(meta()?.lastActivityAt)}
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Quick-access cards below the table keep the design lively on larger screens. */}
            <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <For each={cat().subcategories.slice(0, 6)}>
                {(sub) => (
                  <A
                    href={`/${params.category}/${sub.slug}`}
                    class="card border border-base-content/10 bg-base-100 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div class="card-body p-4">
                      <p class="text-[11px] font-bold uppercase tracking-wide text-base-content/60">
                        {sub.slug.toUpperCase()}
                      </p>
                      <h3 class="text-base font-bold">{sub.name}</h3>
                      <p class="text-sm text-base-content/60">
                        {sub.description ??
                          "Open this board to read and join active discussions."}
                      </p>
                    </div>
                  </A>
                )}
              </For>
            </section>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
