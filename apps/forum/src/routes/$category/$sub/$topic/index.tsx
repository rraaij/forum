import { Avatar } from "@forum/ui";
import {
  createFileRoute,
  Link,
  useParams,
  useRouter,
} from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { createMemo, createSignal, For, Show } from "solid-js";
import ForumPageHeader from "@/components/forum-page-header";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

interface Post {
  id: string;
  content: string;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
}

interface Topic {
  id: string;
  title: string;
  slug: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  postCount: number;
  createdAt: string;
  posts: Post[];
}

// Resolves the topic ID from slugs, then fetches full topic data.
const fetchTopic = createServerFn({ method: "GET" })
  .inputValidator(
    (params: { categorySlug: string; subSlug: string; topicSlug: string }) =>
      params,
  )
  .handler(async ({ data }) => {
    const category = await apiFetch<{
      subcategories: { id: string; slug: string }[];
    }>(`/categories/${data.categorySlug}`);
    const sub = category.subcategories.find((s) => s.slug === data.subSlug);
    if (!sub) throw new Error("Subcategory not found");

    const topics = await apiFetch<{ id: string; slug: string }[]>(
      `/topics?subcategoryId=${sub.id}`,
    );
    const t = topics.find((topicItem) => topicItem.slug === data.topicSlug);
    if (!t) throw new Error("Topic not found");

    return apiFetch<Topic>(`/topics/${t.id}`);
  });

const postReply = createServerFn({ method: "POST" })
  .inputValidator((data: { topicId: string; content: string }) => data)
  .handler(async ({ data }) => {
    return await apiFetch("/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
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
  const router = useRouter();
  const session = useSession();
  const user = () => session().data?.user;
  const topic = Route.useLoaderData();

  const [replyContent, setReplyContent] = createSignal("");
  const [replying, setReplying] = createSignal(false);

  const replyCount = createMemo(() =>
    Math.max(0, (topic()?.postCount ?? 0) - 1),
  );

  const formatDateTime = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Unknown time";

  const handleReply = async (e: Event) => {
    e.preventDefault();
    const currentTopic = topic();
    if (!currentTopic) return;

    setReplying(true);
    await postReply({
      data: { topicId: currentTopic.id, content: replyContent() },
    });
    setReplyContent("");
    setReplying(false);
    await router.invalidate();
  };

  return (
    <div class="space-y-6">
      <ForumPageHeader
        forumCode={params.sub?.toUpperCase() ?? ""}
        title={topic().title}
        description="Read every response in this topic, react to key posts, and add your own contribution below."
        stats={[
          { label: "posts", value: String(topic().postCount) },
          { label: "views", value: String(topic().viewCount) },
          { label: "replies", value: String(replyCount()) },
        ]}
        tags={[
          params.category?.toUpperCase() ?? "",
          params.sub?.toUpperCase() ?? "",
          topic().isPinned ? "PINNED" : "DISCUSSION",
          topic().isLocked ? "LOCKED" : "OPEN",
        ]}
      />

      <div class="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/">Forum</Link>
          </li>
          <li>
            <Link to="/$category" params={{ category: params.category }}>
              {params.category}
            </Link>
          </li>
          <li>
            <Link
              to="/$category/$sub"
              params={{ category: params.category, sub: params.sub }}
            >
              {params.sub}
            </Link>
          </li>
          <li>{topic().title}</li>
        </ul>
      </div>

      <section class="card border border-base-content/10 bg-base-100 shadow-md">
        <div class="card-body py-4">
          <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div class="flex items-center gap-2">
              <Show when={topic().isPinned}>
                <span class="badge badge-secondary">Pinned</span>
              </Show>
              <Show when={topic().isLocked}>
                <span class="badge badge-warning">Locked</span>
              </Show>
              <span class="font-semibold">{replyCount()} replies</span>
              <span class="text-base-content/50">|</span>
              <span>{topic().viewCount} views</span>
            </div>
            <span class="text-base-content/60">
              Started {formatDateTime(topic().createdAt)}
            </span>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <For each={topic().posts}>
          {(post, index) => (
            <article class="overflow-hidden rounded-lg border border-base-content/15 bg-base-100 shadow-sm">
              <div class="grid md:grid-cols-[220px_1fr]">
                <aside class="border-b border-base-content/10 bg-base-200/55 p-4 md:border-b-0 md:border-r">
                  <div class="flex items-center gap-3">
                    <Avatar
                      src={post.authorImage}
                      name={post.authorName}
                      size="md"
                    />
                    <div>
                      <p class="font-bold leading-tight">
                        {post.authorName ?? "Unknown"}
                      </p>
                      <p class="text-xs text-base-content/60">
                        User #{post.authorId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </aside>

                <div class="p-4 md:p-6">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    <span>{formatDateTime(post.createdAt)}</span>
                    <div class="flex items-center gap-3">
                      <span>#{index() + 1}</span>
                      <button class="link link-hover">rapporteer</button>
                      <button class="link link-hover">quote</button>
                    </div>
                  </div>

                  <Show
                    when={!post.isDeleted}
                    fallback={
                      <p class="rounded-md border border-dashed border-base-content/20 p-4 italic text-base-content/50">
                        This post has been deleted.
                      </p>
                    }
                  >
                    <div class="space-y-4">
                      <p class="whitespace-pre-wrap text-base leading-relaxed">
                        {post.content}
                      </p>
                      <Show when={post.editedAt}>
                        <p class="text-xs text-base-content/50">
                          Edited on {formatDateTime(post.editedAt)}
                        </p>
                      </Show>
                    </div>
                  </Show>
                </div>
              </div>
            </article>
          )}
        </For>
      </section>

      <Show when={user() && !topic().isLocked}>
        <section class="card border border-base-content/10 bg-base-100 shadow-lg">
          <div class="card-body">
            <h3 class="text-lg font-bold">Plaats een reactie</h3>
            <form onSubmit={handleReply} class="space-y-4">
              <textarea
                class="textarea textarea-bordered min-h-32 w-full"
                placeholder="Write your reply..."
                value={replyContent()}
                onInput={(e) => setReplyContent(e.currentTarget.value)}
                required
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={replying()}
                >
                  {replying() ? (
                    <span class="loading loading-spinner loading-sm" />
                  ) : (
                    "Post Reply"
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </Show>

      <Show when={topic().isLocked}>
        <div class="alert border border-warning/40 bg-warning/10 text-warning-content">
          <span>This topic is locked. No new replies can be posted.</span>
        </div>
      </Show>
    </div>
  );
}
