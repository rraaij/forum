import {
  createFileRoute,
  Link,
  notFound,
  useParams,
} from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { For, Show } from "solid-js";
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

const GRID_BADGE_STYLES = [
  "badge-error",
  "badge-warning",
  "badge-success",
  "badge-info",
  "badge-primary",
  "badge-secondary",
  "badge-accent",
];

const fetchCategory = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const category = await apiFetch<Category>(`/categories/${slug}`);

    const metaEntries = await Promise.all(
      category.subcategories.map(async (sub) => {
        const topics = await apiFetch<TopicSummary[]>(
          `/topics?subcategoryId=${sub.id}`,
        );
        const replyCount = topics.reduce(
          (sum, topic) => sum + Math.max(0, topic.postCount - 1),
          0,
        );
        const lastActivityAt = topics.reduce<string | null>((latest, topic) => {
          const candidate = topic.lastPostAt ?? topic.createdAt;
          if (!latest) return candidate;
          return new Date(candidate) > new Date(latest) ? candidate : latest;
        }, null);
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

    return {
      category,
      meta: Object.fromEntries(metaEntries) as Record<string, SubcategoryMeta>,
    };
  });

export const Route = createFileRoute("/$category/")({
  beforeLoad: ({ params }) => {
    if (params.category.includes(".")) throw notFound();
  },
  loader: ({ params }) => fetchCategory({ data: params.category }),
  component: CategoryPage,
});

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

function CategoryPage() {
  const { category: slug } = useParams({ from: "/$category/" });
  const loaderData = Route.useLoaderData();
  const category = () => loaderData().category;
  const meta = () => loaderData().meta;

  return (
    <div class="space-y-6">
      <ForumPageHeader
        forumCode={category().slug.toUpperCase()}
        title={category().name}
        description={
          category().description ??
          "Browse subforums, discover active discussions, and jump straight into trending topics."
        }
        stats={[
          {
            label: "subforums",
            value: String(category().subcategories.length),
          },
        ]}
        tags={category()
          .subcategories.slice(0, 10)
          .map((sub) => sub.slug.toUpperCase())}
      />

      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/">Forum</Link>
          </li>
          <li>{category().name}</li>
        </ul>
      </div>

      <section class="card border border-base-content/10 bg-base-100 shadow-md">
        <div class="card-body gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold uppercase tracking-wide">Forumgrid</h2>
            <span class="text-xs font-semibold uppercase text-base-content/60">
              {category().subcategories.length} subforums
            </span>
          </div>
          <div class="flex flex-wrap gap-2">
            <For each={category().subcategories}>
              {(sub, index) => (
                <Link
                  to="/$category/$sub"
                  params={{ category: slug, sub: sub.slug }}
                  class={`badge h-8 min-w-12 border-none text-[11px] font-black tracking-wide text-white ${
                    GRID_BADGE_STYLES[index() % GRID_BADGE_STYLES.length]
                  }`}
                  title={sub.name}
                >
                  {sub.slug.slice(0, 4).toUpperCase()}
                </Link>
              )}
            </For>
          </div>
        </div>
      </section>

      <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
              <tr>
                <th>Subforums binnen {category().name}</th>
                <th class="text-right">Topics</th>
                <th class="text-right">Replies</th>
                <th>Laatste reactie</th>
              </tr>
            </thead>
            <tbody>
              <For each={category().subcategories}>
                {(sub) => {
                  const subMeta = () => meta()[sub.id];
                  return (
                    <tr class="align-top">
                      <td>
                        <Link
                          to="/$category/$sub"
                          params={{ category: slug, sub: sub.slug }}
                          class="text-base font-semibold text-info hover:underline"
                        >
                          <Show when={category().icon}>
                            <span class="mr-2">{category().icon}</span>
                          </Show>
                          {sub.name}
                        </Link>
                        <Show when={sub.description}>
                          <p class="mt-1 text-sm text-base-content/60">
                            {sub.description}
                          </p>
                        </Show>
                      </td>
                      <td class="text-right font-semibold">
                        {subMeta()?.topicCount ?? "…"}
                      </td>
                      <td class="text-right">{subMeta()?.replyCount ?? "…"}</td>
                      <td class="text-sm text-base-content/70">
                        {formatTimestamp(subMeta()?.lastActivityAt)}
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <For each={category().subcategories.slice(0, 6)}>
          {(sub) => (
            <Link
              to="/$category/$sub"
              params={{ category: slug, sub: sub.slug }}
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
            </Link>
          )}
        </For>
      </section>
    </div>
  );
}
