import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
  useRouter,
} from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import ForumGrid from "@/components/ForumGrid.tsx";
import PageHeader from "@/components/PageHeader.tsx";
import TopicsList from "@/components/TopicsList.tsx";
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
        createTopic={{
          parent: { subcategoryId: subcategory().id },
          onCreated: handleTopicCreated,
        }}
      />

      <TopicsList
        topics={topics()}
        categorySlug={params().category}
        subcategorySlug={params().sub}
      />
    </div>
  );
}
