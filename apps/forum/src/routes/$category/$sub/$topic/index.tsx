import { createFileRoute, useParams } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import TopicDetailPage from "@/components/TopicDetailPage";
import { apiFetch } from "@/lib/api";
import type { Category, TopicDetail, TopicSummary } from "@/types/forum";

/*
 * `topics` is the URL segment used for topics that belong directly to a
 * category. Every other value identifies a real subforum. Treating both cases
 * here keeps one topic route while preserving all existing public URLs.
 */
const DIRECT_CATEGORY_SEGMENT = "topics";

const fetchTopic = createServerFn({ method: "GET" })
  .validator(
    (params: { categorySlug: string; subSlug: string; topicSlug: string }) =>
      params,
  )
  .handler(async ({ data }) => {
    const category = await apiFetch<Category>(
      `/categories/${data.categorySlug}`,
    );

    /*
     * Resolve the requested parent before loading its topic list. This keeps
     * subforum URLs unambiguous even if two boards happen to use the same topic
     * slug, while the reserved `topics` segment covers direct category topics.
     */
    const subcategory =
      data.subSlug === DIRECT_CATEGORY_SEGMENT
        ? undefined
        : category.subcategories.find((item) => item.slug === data.subSlug);

    if (data.subSlug !== DIRECT_CATEGORY_SEGMENT && !subcategory) {
      throw new Error("Subcategory not found");
    }

    const topics = await apiFetch<TopicSummary[]>(
      subcategory
        ? `/topics?subcategoryId=${subcategory.id}`
        : `/topics?categoryId=${category.id}`,
    );
    const topic = topics.find((item) => item.slug === data.topicSlug);

    if (!topic) throw new Error("Topic not found");

    return {
      topic: await apiFetch<TopicDetail>(`/topics/${topic.id}`),
      // The detail component uses this optional value to include a subforum
      // breadcrumb only for topics that actually live inside a subforum.
      subcategorySlug: subcategory?.slug,
    };
  });

export const Route = createFileRoute("/$category/$sub/$topic/")({
  loader: ({ params }) =>
    fetchTopic({
      data: {
        categorySlug: params.category,
        subSlug: params.sub,
        topicSlug: params.topic,
      },
    }),
  component: TopicPage,
});

function TopicPage() {
  // Params remain reactive when navigating between topics without remounting.
  const params = useParams({ from: "/$category/$sub/$topic/" });
  const loaderData = Route.useLoaderData();

  return (
    <TopicDetailPage
      topic={loaderData().topic}
      categorySlug={params().category}
      subcategorySlug={loaderData().subcategorySlug}
    />
  );
}
