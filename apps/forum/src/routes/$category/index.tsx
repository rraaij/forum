import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useParams,
  useRouter,
} from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { For, Show } from "solid-js";
import ForumGrid from "@/components/ForumGrid";
import PageHeader from "@/components/PageHeader.tsx";
import TopicsList from "@/components/TopicsList.tsx";
import { apiFetch } from "@/lib/api";
import type { Category, SubcategoryMeta, TopicSummary } from "@/types/forum";

const fetchCategory = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const category = await apiFetch<Category>(`/categories/${slug}`);

    /*
     * Direct category topics and subcategory metadata are independent reads.
     * Fetch them together so adding the new topic table does not introduce a
     * second sequential wait to the category page loader.
     */
    const [topics, metaEntries] = await Promise.all([
      apiFetch<TopicSummary[]>(`/topics?categoryId=${category.id}`),
      Promise.all(
        category.subcategories.map(async (sub) => {
          const subTopics = await apiFetch<TopicSummary[]>(
            `/topics?subcategoryId=${sub.id}`,
          );
          const replyCount = subTopics.reduce(
            (sum, topic) => sum + Math.max(0, topic.postCount - 1),
            0,
          );
          const lastActivityAt = subTopics.reduce<string | null>(
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
              topicCount: subTopics.length,
              replyCount,
              lastActivityAt,
            } satisfies SubcategoryMeta,
          ] as const;
        }),
      ),
    ]);

    return {
      category,
      topics,
      meta: Object.fromEntries(metaEntries) as Record<string, SubcategoryMeta>,
    };
  });

export const Route = createFileRoute("/$category/")({
  beforeLoad: ({ params }) => {
    if (params.category.includes(".")) throw notFound();
  },
  loader: ({ params }) => fetchCategory({ data: params.category }),
  component: CategoryPage,
  // This route deliberately throws notFound() for invalid category-like paths,
  // so provide a route-local fallback instead of TanStack's generic default.
  notFoundComponent: CategoryNotFound,
});

function CategoryNotFound() {
  return (
    <section class="mx-auto max-w-2xl rounded-box border border-base-content/10 bg-base-100 p-6 text-center shadow-md">
      <p class="text-sm font-bold uppercase tracking-wide text-info">
        404 - Category not found
      </p>
      <h1 class="mt-2 text-2xl font-black">
        This forum category does not exist.
      </h1>
      <p class="mt-3 text-base-content/65">
        It may have been renamed or removed, or the address may be incorrect.
      </p>
      <Link to="/" class="btn btn-info btn-sm mt-6">
        Back to the forum
      </Link>
    </section>
  );
}

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
  // Keep the slug reactive because Solid Router returns route params through
  // an accessor inside route components.
  const params = useParams({ from: "/$category/" });
  const router = useRouter();
  const navigate = useNavigate();
  const slug = () => params().category;
  const loaderData = Route.useLoaderData();
  const category = () => loaderData().category;
  const topics = () => loaderData().topics;
  const meta = () => loaderData().meta;

  return (
    <div class="space-y-2">
      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/">Forum</Link>
          </li>
          <li>{category().name}</li>
        </ul>
      </div>

      <ForumGrid category={category()} />

      <PageHeader
        forumCode={category().abbreviation}
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
          { label: "topics", value: String(topics().length) },
          {
            label: "replies",
            value: String(
              topics().reduce(
                (sum, topic) => sum + Math.max(0, topic.postCount - 1),
                0,
              ),
            ),
          },
        ]}
        createTopic={{
          parent: { categoryId: category().id },
          onCreated: async (topic) => {
            // Refresh the table first, then open the newly-created direct
            // category topic using its dedicated detail route.
            await router.invalidate();
            await navigate({
              to: "/$category/topics/$topic",
              params: {
                category: slug(),
                topic: topic.slug,
              },
            });
          },
        }}
      />

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
                          params={{ category: slug(), sub: sub.slug }}
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

      <TopicsList topics={topics()} categorySlug={slug()} />
    </div>
  );
}
