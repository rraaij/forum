import { createFileRoute, useParams } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import TopicDetailPage from "@/components/TopicDetailPage";
import { apiFetch } from "@/lib/api";
import type { Category, TopicDetail, TopicSummary } from "@/types/forum";

// Resolves the topic ID from slugs, then fetches full topic data.
const fetchTopic = createServerFn({ method: "GET" })
  .validator(
    (params: { categorySlug: string; subSlug: string; topicSlug: string }) =>
      params,
  )
  .handler(async ({ data }) => {
    const category = await apiFetch<Category>(
      `/categories/${data.categorySlug}`,
    );
    const sub = category.subcategories.find((s) => s.slug === data.subSlug);
    if (!sub) throw new Error("Subcategory not found");

    const topics = await apiFetch<TopicSummary[]>(
      `/topics?subcategoryId=${sub.id}`,
    );
    const t = topics.find((topicItem) => topicItem.slug === data.topicSlug);
    if (!t) throw new Error("Topic not found");

    return apiFetch<TopicDetail>(`/topics/${t.id}`);
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
  const params = useParams({ from: "/$category/$sub/$topic/" });
  const topic = Route.useLoaderData();

  return (
    // Keep route-specific data resolution here while the complete topic UI is
    // shared with direct category topics.
    <TopicDetailPage
      topic={topic()}
      categorySlug={params().category}
      subcategorySlug={params().sub}
    />
  );
}
