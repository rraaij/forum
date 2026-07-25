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
import { fetchBoardPage } from "@/features/forum-read/api";
import { createPageAccumulator } from "@/features/forum-read/use-page-accumulator";

export const Route = createFileRoute(
  "/categories/$categorySlug/subcategories/$boardId/",
)({
  // One page-oriented request; ancestry is verified server-side.
  loader: ({ params }) => fetchBoardPage(params.categorySlug, params.boardId),
  component: BoardPage,
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

function BoardPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const page = Route.useLoaderData();
  const board = () => page().board;
  const rootSlug = () => page().breadcrumbs[0]?.slug ?? "";

  const topics = createPageAccumulator(
    () => page().topics,
    (cursor) =>
      fetchBoardPage(rootSlug(), board().id, cursor).then(
        (next) => next.topics,
      ),
  );

  return (
    <div class="space-y-2">
      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/">Forum</Link>
          </li>
          <For each={page().breadcrumbs}>
            {(crumb) => (
              <li>
                <Show
                  when={crumb.boardId !== board().id}
                  fallback={<span>{crumb.name}</span>}
                >
                  <Show
                    when={crumb.isRoot}
                    fallback={
                      <Link
                        to="/categories/$categorySlug/subcategories/$boardId"
                        params={{
                          categorySlug: rootSlug(),
                          boardId: crumb.boardId,
                        }}
                      >
                        {crumb.name}
                      </Link>
                    }
                  >
                    <Link
                      to="/categories/$categorySlug"
                      params={{ categorySlug: crumb.slug }}
                    >
                      {crumb.name}
                    </Link>
                  </Show>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </div>

      <Show when={page().childBoards.length > 0}>
        <ForumGrid categorySlug={rootSlug()} boards={page().childBoards} />
      </Show>

      <PageHeader
        forumCode={board().abbreviation}
        title={board().name}
        description={
          board().description ??
          "Follow the latest discussions, sticky announcements, and the busiest active topics."
        }
        stats={[
          { label: "topics", value: String(board().totalTopicCount) },
          { label: "subforums", value: String(page().childBoards.length) },
        ]}
        createTopic={{
          boardId: board().id,
          onCreated: async (topic) => {
            await router.invalidate();
            await navigate({
              to: "/categories/$categorySlug/subcategories/$boardId/topics/$topicSlug",
              params: {
                categorySlug: rootSlug(),
                boardId: board().id,
                topicSlug: topic.slug,
              },
            });
          },
        }}
      />

      <Show when={page().childBoards.length > 0}>
        <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
                <tr>
                  <th>Subforums binnen {board().name}</th>
                  <th class="text-right">Topics</th>
                  <th>Laatste activiteit</th>
                </tr>
              </thead>
              <tbody>
                <For each={page().childBoards}>
                  {(child) => (
                    <tr class="align-top">
                      <td>
                        <Link
                          to="/categories/$categorySlug/subcategories/$boardId"
                          params={{
                            categorySlug: rootSlug(),
                            boardId: child.id,
                          }}
                          class="text-base font-semibold text-info hover:underline"
                        >
                          {child.name}
                        </Link>
                        <Show when={child.description}>
                          <p class="mt-1 text-sm text-base-content/60">
                            {child.description}
                          </p>
                        </Show>
                      </td>
                      <td class="text-right font-semibold">
                        {child.totalTopicCount}
                      </td>
                      <td class="text-sm text-base-content/70">
                        {formatTimestamp(child.latestActivity?.at ?? null)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </section>
      </Show>

      <TopicsList
        topics={topics.items()}
        nextCursor={topics.nextCursor()}
        loadingMore={topics.loading()}
        onLoadMore={topics.loadMore}
      />
    </div>
  );
}
