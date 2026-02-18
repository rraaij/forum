import { A, useNavigate, useParams } from "@solidjs/router";
import { createResource, createSignal, For, Show, Suspense } from "solid-js";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

interface Topic {
  id: string;
  title: string;
  slug: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  postCount: number;
  lastPostAt: string | null;
  createdAt: string;
  authorId: string;
  authorName: string | null;
}

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
  subcategories: Subcategory[];
}

export default function SubcategoryPage() {
  const params = useParams();
  const session = useSession();
  const user = () => session().data?.user;
  const navigate = useNavigate();

  const [category] = createResource(
    () => params.category,
    (slug) => apiFetch<Category>(`/categories/${slug}`),
  );

  const subcategory = () =>
    category()?.subcategories.find((s) => s.slug === params.sub);

  const [topics, { refetch }] = createResource(
    () => subcategory()?.id,
    (subId) => apiFetch<Topic[]>(`/topics?subcategoryId=${subId}`),
  );

  // New topic form state
  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");

  const handleCreateTopic = async (e: Event) => {
    e.preventDefault();
    const sub = subcategory();
    if (!sub) return;

    const topic = await apiFetch<{ id: string; slug: string }>("/topics", {
      method: "POST",
      body: JSON.stringify({
        subcategoryId: sub.id,
        title: title(),
        content: content(),
      }),
    });

    setShowForm(false);
    setTitle("");
    setContent("");
    refetch();
    navigate(`/${params.category}/${params.sub}/${topic.slug}`);
  };

  return (
    <Suspense fallback={<span class="loading loading-spinner loading-lg" />}>
      <Show when={subcategory()}>
        {(sub) => (
          <div>
            <div class="breadcrumbs text-sm mb-4">
              <ul>
                <li>
                  <A href="/">Forum</A>
                </li>
                <li>
                  <A href={`/${params.category}`}>{category()?.name}</A>
                </li>
                <li>{sub().name}</li>
              </ul>
            </div>

            <div class="flex items-center justify-between mb-6">
              <h1 class="text-2xl font-bold">{sub().name}</h1>
              <Show when={user()}>
                <button
                  class="btn btn-primary btn-sm"
                  onClick={() => setShowForm(!showForm())}
                >
                  New Topic
                </button>
              </Show>
            </div>

            <Show when={showForm()}>
              <div class="card bg-base-100 shadow mb-6">
                <div class="card-body">
                  <form onSubmit={handleCreateTopic} class="space-y-4">
                    <input
                      type="text"
                      class="input input-bordered w-full"
                      placeholder="Topic title"
                      value={title()}
                      onInput={(e) => setTitle(e.currentTarget.value)}
                      required
                    />
                    <textarea
                      class="textarea textarea-bordered w-full"
                      placeholder="Write your post..."
                      rows={6}
                      value={content()}
                      onInput={(e) => setContent(e.currentTarget.value)}
                      required
                    />
                    <div class="flex gap-2 justify-end">
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm"
                        onClick={() => setShowForm(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" class="btn btn-primary btn-sm">
                        Create Topic
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Show>

            <div class="overflow-x-auto">
              <table class="table bg-base-100">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Author</th>
                    <th>Replies</th>
                    <th>Views</th>
                    <th>Last Post</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={topics()}
                    fallback={
                      <tr>
                        <td
                          colspan="5"
                          class="text-center text-base-content/60"
                        >
                          No topics yet. Be the first to start a discussion!
                        </td>
                      </tr>
                    }
                  >
                    {(topic) => (
                      <tr class="hover">
                        <td>
                          <A
                            href={`/${params.category}/${params.sub}/${topic.slug}`}
                            class="font-semibold hover:text-primary"
                          >
                            <Show when={topic.isPinned}>
                              <span class="badge badge-accent badge-xs mr-1">
                                Pinned
                              </span>
                            </Show>
                            <Show when={topic.isLocked}>
                              <span class="badge badge-warning badge-xs mr-1">
                                Locked
                              </span>
                            </Show>
                            {topic.title}
                          </A>
                        </td>
                        <td class="text-sm">{topic.authorName ?? "Unknown"}</td>
                        <td>{Math.max(0, topic.postCount - 1)}</td>
                        <td>{topic.viewCount}</td>
                        <td class="text-sm">
                          {topic.lastPostAt
                            ? new Date(topic.lastPostAt).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
