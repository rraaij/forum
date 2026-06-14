import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
  useRouter,
} from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { createMemo, For, Show } from "solid-js";
import { CreateTopicPanel } from "@/components/CreateTopicPanel";
import ForumGrid from "@/components/ForumGrid.tsx";
import PageHeader from "@/components/PageHeader.tsx";
import { apiFetch } from "@/lib/api";
import type { Category, SubcategoryMeta, TopicSummary } from "@/types/forum";

// Fetch all data needed for the subcategory page in a single server call.
const fetchSubcategoryPage = createServerFn({ method: "GET" })
  .validator((params: { categorySlug: string; subSlug: string }) => params)
  .handler(async ({ data }) => {
    const category = await apiFetch<Category>(
      `/categories/${data.categorySlug}`,
    );
    const subcategory = category.subcategories.find(
      (s) => s.slug === data.subSlug,
    );
    if (!subcategory) throw new Error("Subcategory not found");

    // Fetch all sibling topics in parallel (includes current sub).
    const allTopicsResults = await Promise.all(
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
            return new Date(candidate) > new Date(latest) ? candidate : latest;
          },
          null,
        );
        return {
          subId: sub.id,
          topics: subTopics,
          meta: {
            topicCount: subTopics.length,
            replyCount,
            lastActivityAt,
          } satisfies SubcategoryMeta,
        };
      }),
    );

    // Derive current sub's topics from the already-fetched data.
    const currentSubResult = allTopicsResults.find(
      (r) => r.subId === subcategory.id,
    );
    const topics = currentSubResult?.topics ?? [];

    const subcategoryMeta = Object.fromEntries(
      allTopicsResults.map((r) => [r.subId, r.meta]),
    ) as Record<string, SubcategoryMeta>;

    return {
      category,
      subcategory,
      topics,
      subcategoryMeta,
    };
  });

export const Route = createFileRoute("/$category/$sub/")({
  loader: ({ params }) =>
    fetchSubcategoryPage({
      data: { categorySlug: params.category, subSlug: params.sub },
    }),
  component: SubcategoryPage,
});

const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No activity yet";

function SubcategoryPage() {
  // Solid Router exposes component params as a reactive accessor. Calling it
  // keeps every link synchronized if this component is reused for new params.
  const params = useParams({ from: "/$category/$sub/" });
  const router = useRouter();
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
  const category = () => loaderData().category;
  const subcategory = () => loaderData().subcategory;
  const topics = () => loaderData().topics;
  const subcategoryMeta = () => loaderData().subcategoryMeta;

  const pinnedTopics = createMemo(() =>
    topics().filter((topic) => topic.isPinned),
  );
  const openTopics = createMemo(() =>
    topics().filter((topic) => !topic.isPinned),
  );

  const handleTopicCreated = async (topic: { slug: string }) => {
    // Refresh the route data before navigating so returning to this board shows
    // the new topic without requiring a manual reload.
    await router.invalidate();
    await navigate({
      to: "/$category/$sub/$topic",
      params: {
        category: params().category,
        sub: params().sub,
        topic: topic.slug,
      },
    });
  };

  return (
    <div class="space-y-2">
      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/">Forum</Link>
          </li>
          <li>
            <Link to="/$category" params={{ category: params().category }}>
              {category().name}
            </Link>
          </li>
          <li>{subcategory().name}</li>
        </ul>
      </div>

      <ForumGrid category={category()} />

      <PageHeader
        forumCode={subcategory().slug.toUpperCase()}
        title={subcategory().name}
        description={
          subcategory().description ??
          "Follow the latest discussions, sticky announcements, and the busiest active topics."
        }
        stats={[
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
        tags={category()
          .subcategories.slice(0, 12)
          .map((item) => item.slug.toUpperCase())}
      />

      <section class="card border border-base-content/10 bg-base-100 shadow-md">
        <div class="card-body gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <button class="btn btn-sm btn-neutral">custom menu</button>
              <button class="btn btn-sm btn-ghost">abonnement</button>
              <button class="btn btn-sm btn-ghost">actieve topics</button>
              <button class="btn btn-sm btn-ghost">nieuwe topics</button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select class="select select-sm w-44">
                <option>Meer / minder topics</option>
                <option>Nieuwste eerst</option>
                <option>Meeste reacties</option>
                <option>Meeste views</option>
              </select>
            </div>
          </div>

          {/* Keep the editor outside the compact toolbar groups so its title
              and post fields can use the full width of the card. */}
          <CreateTopicPanel
            parent={{ subcategoryId: subcategory().id }}
            onCreated={handleTopicCreated}
          />
        </div>
      </section>

      <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
              <tr>
                <th>Subforums binnen {category().name}</th>
                <th class="text-right">Topics</th>
                <th class="text-right">Reacties</th>
                <th>Laatste reactie</th>
              </tr>
            </thead>
            <tbody>
              <For each={category().subcategories}>
                {(item) => {
                  const meta = () => subcategoryMeta()[item.id];
                  return (
                    <tr class="align-top">
                      <td>
                        <Link
                          to="/$category/$sub"
                          params={{
                            category: params().category,
                            sub: item.slug,
                          }}
                          class="text-base font-semibold text-info hover:underline"
                        >
                          {item.name}
                        </Link>
                        <Show when={item.description}>
                          <p class="mt-1 text-sm text-base-content/60">
                            {item.description}
                          </p>
                        </Show>
                      </td>
                      <td class="text-right font-semibold">
                        {meta()?.topicCount ?? "…"}
                      </td>
                      <td class="text-right">{meta()?.replyCount ?? "…"}</td>
                      <td class="text-sm text-base-content/70">
                        {formatDateTime(meta()?.lastActivityAt)}
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </section>

      <Show when={pinnedTopics().length > 0}>
        <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
                <tr>
                  <th>Sticky topics</th>
                  <th>topicstarter</th>
                  <th class="text-right">reacties</th>
                  <th class="text-right">views</th>
                  <th>laatste reactie</th>
                </tr>
              </thead>
              <tbody>
                <For each={pinnedTopics()}>
                  {(topic) => (
                    <tr>
                      <td>
                        <Link
                          to="/$category/$sub/$topic"
                          params={{
                            category: params().category,
                            sub: params().sub,
                            topic: topic.slug,
                          }}
                          class="font-bold text-info hover:underline"
                        >
                          <span class="badge badge-secondary mr-2">Pinned</span>
                          {topic.title}
                        </Link>
                      </td>
                      <td>{topic.authorName ?? "Unknown"}</td>
                      <td class="text-right">
                        {Math.max(0, topic.postCount - 1)}
                      </td>
                      <td class="text-right">{topic.viewCount}</td>
                      <td class="text-sm text-base-content/70">
                        {formatDateTime(topic.lastPostAt ?? topic.createdAt)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </section>
      </Show>

      <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
              <tr>
                <th>Open topics</th>
                <th>topicstarter</th>
                <th class="text-right">reacties</th>
                <th class="text-right">views</th>
                <th>laatste reactie</th>
              </tr>
            </thead>
            <tbody>
              <For
                each={openTopics()}
                fallback={
                  <tr>
                    <td
                      colspan="5"
                      class="py-8 text-center text-base-content/60"
                    >
                      No topics yet. Start the first discussion in this board.
                    </td>
                  </tr>
                }
              >
                {(topic) => (
                  <tr>
                    <td>
                      <Link
                        to="/$category/$sub/$topic"
                        params={{
                          category: params().category,
                          sub: params().sub,
                          topic: topic.slug,
                        }}
                        class="font-semibold text-info hover:underline"
                      >
                        <Show when={topic.isLocked}>
                          <span class="badge badge-warning mr-2">Locked</span>
                        </Show>
                        {topic.title}
                      </Link>
                    </td>
                    <td>{topic.authorName ?? "Unknown"}</td>
                    <td class="text-right">
                      {Math.max(0, topic.postCount - 1)}
                    </td>
                    <td class="text-right">{topic.viewCount}</td>
                    <td class="text-sm text-base-content/70">
                      {formatDateTime(topic.lastPostAt ?? topic.createdAt)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
