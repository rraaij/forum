import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import ForumGrid from "@/components/ForumGrid";
import PageHeader from "@/components/PageHeader";
import TopicsList from "@/components/TopicsList";
import { fetchCategoryPage } from "@/features/forum-read/api";
import { createPageAccumulator } from "@/features/forum-read/use-page-accumulator";

export const Route = createFileRoute("/categories/$categorySlug/")({
  // One page-oriented request replaces the old per-board N+1 composition.
  loader: ({ params }) => fetchCategoryPage(params.categorySlug),
  component: CategoryPage,
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
  const router = useRouter();
  const navigate = useNavigate();
  const page = Route.useLoaderData();
  const category = () => page().category;

  const topics = createPageAccumulator(
    () => page().topics,
    (cursor) =>
      fetchCategoryPage(category().slug, cursor).then((next) => next.topics),
  );

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

      <ForumGrid categorySlug={category().slug} boards={page().childBoards} />

      <PageHeader
        forumCode={category().abbreviation}
        title={category().name}
        description={
          category().description ??
          "Browse subforums, discover active discussions, and jump straight into trending topics."
        }
        stats={[
          { label: "subforums", value: String(page().childBoards.length) },
          { label: "topics", value: String(category().totalTopicCount) },
        ]}
        createTopic={{
          boardId: category().id,
          onCreated: async (topic) => {
            // Refresh the table first, then open the new direct category
            // topic through its canonical root-topic path.
            await router.invalidate();
            await navigate({
              to: "/categories/$categorySlug/topics/$topicSlug",
              params: {
                categorySlug: category().slug,
                topicSlug: topic.slug,
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
                <th>Laatste activiteit</th>
              </tr>
            </thead>
            <tbody>
              <For each={page().childBoards}>
                {(board) => (
                  <tr class="align-top">
                    <td>
                      <Link
                        to="/categories/$categorySlug/subcategories/$boardId"
                        params={{
                          categorySlug: category().slug,
                          boardId: board.id,
                        }}
                        class="text-base font-semibold text-info hover:underline"
                      >
                        {board.name}
                      </Link>
                      <Show when={board.description}>
                        <p class="mt-1 text-sm text-base-content/60">
                          {board.description}
                        </p>
                      </Show>
                    </td>
                    <td class="text-right font-semibold">
                      {board.totalTopicCount}
                    </td>
                    <td class="text-sm text-base-content/70">
                      {formatTimestamp(board.latestActivity?.at ?? null)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </section>

      <TopicsList
        topics={topics.items()}
        nextCursor={topics.nextCursor()}
        loadingMore={topics.loading()}
        onLoadMore={topics.loadMore}
      />
    </div>
  );
}
