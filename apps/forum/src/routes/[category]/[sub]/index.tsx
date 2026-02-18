import { A, useNavigate, useParams } from "@solidjs/router";
import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  Suspense,
} from "solid-js";
import ForumPageHeader from "@/components/forum-page-header";
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

interface SubcategoryMeta {
  topicCount: number;
  replyCount: number;
  lastActivityAt: string | null;
}

// Matching the colorful forum-grid strip keeps the page close to the design inspiration.
const GRID_BADGE_STYLES = [
  "badge-error",
  "badge-warning",
  "badge-success",
  "badge-info",
  "badge-primary",
  "badge-secondary",
  "badge-accent",
];

export default function SubcategoryPage() {
  const params = useParams();
  const session = useSession();
  const user = () => session().data?.user;
  const navigate = useNavigate();

  // Category data gives us both the board title and sibling-subforum navigation.
  const [category] = createResource(
    () => params.category,
    (slug) => apiFetch<Category>(`/categories/${slug}`),
  );

  // We resolve the current board from route params so we can safely render once data is available.
  const subcategory = () =>
    category()?.subcategories.find((s) => s.slug === params.sub);

  // Topic list for the current board powers sticky/open sections and the header stats.
  const [topics, { refetch }] = createResource(
    () => subcategory()?.id,
    (subId) => apiFetch<Topic[]>(`/topics?subcategoryId=${subId}`),
  );

  // Sibling stats keep the "subforums binnen ..." block informative instead of static.
  const [subcategoryMeta] = createResource(
    () => category(),
    async (cat) => {
      if (!cat) {
        return {} as Record<string, SubcategoryMeta>;
      }

      const entries = await Promise.all(
        cat.subcategories.map(async (sub) => {
          const subTopics = await apiFetch<Topic[]>(
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
      );

      return Object.fromEntries(entries);
    },
  );

  // New topic form state.
  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");

  // Split pinned and normal topics so each gets its own section like a classic forum page.
  const pinnedTopics = createMemo(() =>
    (topics() ?? []).filter((topic) => topic.isPinned),
  );
  const openTopics = createMemo(() =>
    (topics() ?? []).filter((topic) => !topic.isPinned),
  );

  // Shared date formatting keeps every table visually consistent.
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

    // Reset the composer state after successful creation.
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
          <div class="space-y-6">
            {/* Hero banner is shared to keep every forum page aligned with the same visual style. */}
            <ForumPageHeader
              forumCode={sub().slug.toUpperCase()}
              title={sub().name}
              description={
                sub().description ??
                "Follow the latest discussions, sticky announcements, and the busiest active topics."
              }
              stats={[
                { label: "topics", value: String(topics()?.length ?? 0) },
                {
                  label: "replies",
                  value: String(
                    (topics() ?? []).reduce(
                      (sum, topic) => sum + Math.max(0, topic.postCount - 1),
                      0,
                    ),
                  ),
                },
              ]}
              tags={category()
                ?.subcategories.slice(0, 12)
                .map((item) => item.slug.toUpperCase())}
            />

            {/* Breadcrumbs remain directly below the hero for orientation. */}
            <div class="breadcrumbs text-sm">
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

            {/* Header controls replicate the topic-filter + new-topic action row pattern. */}
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
                    <Show when={user()}>
                      <button
                        class="btn btn-info btn-sm"
                        onClick={() => setShowForm(!showForm())}
                      >
                        {showForm() ? "Close editor" : "Nieuw Topic"}
                      </button>
                    </Show>
                  </div>
                </div>

                {/* Topic composer keeps existing functionality but now matches the new panel style. */}
                <Show when={showForm()}>
                  <div class="rounded-xl border border-base-content/10 bg-base-200/45 p-4">
                    <form onSubmit={handleCreateTopic} class="space-y-3">
                      <label class="form-control gap-2">
                        <span class="label-text font-semibold">
                          Topic title
                        </span>
                        <input
                          type="text"
                          class="input input-bordered w-full"
                          placeholder="Start with a clear and specific title"
                          value={title()}
                          onInput={(e) => setTitle(e.currentTarget.value)}
                          required
                        />
                      </label>
                      <label class="form-control gap-2">
                        <span class="label-text font-semibold">
                          Opening post
                        </span>
                        <textarea
                          class="textarea textarea-bordered w-full"
                          placeholder="Write your first post..."
                          rows={6}
                          value={content()}
                          onInput={(e) => setContent(e.currentTarget.value)}
                          required
                        />
                      </label>
                      <div class="flex justify-end gap-2">
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
                </Show>
              </div>
            </section>

            {/* The colorful board-strip echoes the exact category-page language from the reference. */}
            <section class="card border border-base-content/10 bg-base-100 shadow-md">
              <div class="card-body gap-4">
                <h2 class="text-lg font-bold uppercase tracking-wide">
                  Forumgrid
                </h2>
                <div class="flex flex-wrap gap-2">
                  <For each={category()?.subcategories ?? []}>
                    {(item, index) => (
                      <A
                        href={`/${params.category}/${item.slug}`}
                        class={`badge h-8 min-w-12 border-none text-[11px] font-black tracking-wide text-white ${
                          GRID_BADGE_STYLES[index() % GRID_BADGE_STYLES.length]
                        }`}
                        title={item.name}
                      >
                        {item.slug.slice(0, 4).toUpperCase()}
                      </A>
                    )}
                  </For>
                </div>
              </div>
            </section>

            {/* Sibling subforum table keeps context for users who might want to jump boards quickly. */}
            <section class="card overflow-hidden border border-base-content/10 bg-base-100 shadow-md">
              <div class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead class="bg-base-200/70 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th>Subforums binnen {category()?.name}</th>
                      <th class="text-right">Topics</th>
                      <th class="text-right">Reacties</th>
                      <th>Laatste reactie</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={category()?.subcategories ?? []}>
                      {(item) => {
                        const meta = () => subcategoryMeta()?.[item.id];
                        return (
                          <tr class="align-top">
                            <td>
                              <A
                                href={`/${params.category}/${item.slug}`}
                                class="text-base font-semibold text-info hover:underline"
                              >
                                {item.name}
                              </A>
                              <Show when={item.description}>
                                <p class="mt-1 text-sm text-base-content/60">
                                  {item.description}
                                </p>
                              </Show>
                            </td>
                            <td class="text-right font-semibold">
                              {meta()?.topicCount ?? "…"}
                            </td>
                            <td class="text-right">
                              {meta()?.replyCount ?? "…"}
                            </td>
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

            {/* Sticky section appears only when pinned topics exist, just like traditional forum boards. */}
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
                              <A
                                href={`/${params.category}/${params.sub}/${topic.slug}`}
                                class="font-bold text-info hover:underline"
                              >
                                <span class="badge badge-secondary mr-2">
                                  Pinned
                                </span>
                                {topic.title}
                              </A>
                            </td>
                            <td>{topic.authorName ?? "Unknown"}</td>
                            <td class="text-right">
                              {Math.max(0, topic.postCount - 1)}
                            </td>
                            <td class="text-right">{topic.viewCount}</td>
                            <td class="text-sm text-base-content/70">
                              {formatDateTime(
                                topic.lastPostAt ?? topic.createdAt,
                              )}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </section>
            </Show>

            {/* Open-topic section is always shown and includes empty-state messaging. */}
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
                            No topics yet. Start the first discussion in this
                            board.
                          </td>
                        </tr>
                      }
                    >
                      {(topic) => (
                        <tr>
                          <td>
                            <A
                              href={`/${params.category}/${params.sub}/${topic.slug}`}
                              class="font-semibold text-info hover:underline"
                            >
                              <Show when={topic.isLocked}>
                                <span class="badge badge-warning mr-2">
                                  Locked
                                </span>
                              </Show>
                              {topic.title}
                            </A>
                          </td>
                          <td>{topic.authorName ?? "Unknown"}</td>
                          <td class="text-right">
                            {Math.max(0, topic.postCount - 1)}
                          </td>
                          <td class="text-right">{topic.viewCount}</td>
                          <td class="text-sm text-base-content/70">
                            {formatDateTime(
                              topic.lastPostAt ?? topic.createdAt,
                            )}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
