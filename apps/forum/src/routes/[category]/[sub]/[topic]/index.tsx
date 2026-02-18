import { Avatar } from "@forum/ui";
import { A, useParams } from "@solidjs/router";
import { createResource, createSignal, For, Show, Suspense } from "solid-js";
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

export default function TopicPage() {
  const params = useParams();
  const session = useSession();
  const user = () => session().data?.user;

  // Find topic by slug — first fetch subcategory to get topic list
  // For now, we use the slug as ID lookup (API would need to support this)
  const [topic, { refetch }] = createResource(
    () => params.topic,
    async (slug) => {
      // The topics route needs a slug-based lookup
      // For now, get topics by subcategory and find by slug
      const category = await apiFetch<{
        subcategories: { id: string; slug: string }[];
      }>(`/categories/${params.category}`);
      const sub = category.subcategories.find((s) => s.slug === params.sub);
      if (!sub) throw new Error("Subcategory not found");

      const topics = await apiFetch<{ id: string; slug: string }[]>(
        `/topics?subcategoryId=${sub.id}`,
      );
      const t = topics.find((t) => t.slug === slug);
      if (!t) throw new Error("Topic not found");

      return apiFetch<Topic>(`/topics/${t.id}`);
    },
  );

  const [replyContent, setReplyContent] = createSignal("");
  const [replying, setReplying] = createSignal(false);

  const handleReply = async (e: Event) => {
    e.preventDefault();
    const t = topic();
    if (!t) return;

    setReplying(true);
    await apiFetch("/posts", {
      method: "POST",
      body: JSON.stringify({
        topicId: t.id,
        content: replyContent(),
      }),
    });
    setReplyContent("");
    setReplying(false);
    refetch();
  };

  return (
    <Suspense fallback={<span class="loading loading-spinner loading-lg" />}>
      <Show when={topic()}>
        {(t) => (
          <div>
            <div class="breadcrumbs text-sm mb-4">
              <ul>
                <li>
                  <A href="/">Forum</A>
                </li>
                <li>
                  <A href={`/${params.category}`}>{params.category}</A>
                </li>
                <li>
                  <A href={`/${params.category}/${params.sub}`}>{params.sub}</A>
                </li>
                <li>{t().title}</li>
              </ul>
            </div>

            <h1 class="text-2xl font-bold mb-1">{t().title}</h1>
            <p class="text-sm text-base-content/60 mb-6">
              {t().viewCount} views · {t().postCount} posts
            </p>

            <div class="space-y-4">
              <For each={t().posts}>
                {(post) => (
                  <div class="card bg-base-100 shadow">
                    <div class="card-body">
                      <div class="flex items-start gap-3">
                        <Avatar
                          src={post.authorImage}
                          name={post.authorName}
                          size="sm"
                        />
                        <div class="flex-1">
                          <div class="flex items-center gap-2 mb-2">
                            <span class="font-semibold">
                              {post.authorName ?? "Unknown"}
                            </span>
                            <span class="text-xs text-base-content/50">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                            <Show when={post.editedAt}>
                              <span class="text-xs text-base-content/40">
                                (edited)
                              </span>
                            </Show>
                          </div>
                          <Show
                            when={!post.isDeleted}
                            fallback={
                              <p class="italic text-base-content/40">
                                This post has been deleted.
                              </p>
                            }
                          >
                            <div class="prose prose-sm max-w-none">
                              {post.content}
                            </div>
                          </Show>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={user() && !t().isLocked}>
              <div class="card bg-base-100 shadow mt-6">
                <div class="card-body">
                  <h3 class="font-semibold mb-2">Reply</h3>
                  <form onSubmit={handleReply} class="space-y-4">
                    <textarea
                      class="textarea textarea-bordered w-full"
                      placeholder="Write your reply..."
                      rows={4}
                      value={replyContent()}
                      onInput={(e) => setReplyContent(e.currentTarget.value)}
                      required
                    />
                    <div class="flex justify-end">
                      <button
                        type="submit"
                        class="btn btn-primary btn-sm"
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
              </div>
            </Show>

            <Show when={t().isLocked}>
              <div class="alert mt-6">
                <span>This topic is locked. No new replies can be posted.</span>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
