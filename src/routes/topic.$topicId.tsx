import { createFileRoute, Link } from "@tanstack/solid-router";
import { createQuery, createMutation } from "@tanstack/solid-query";
import { forumApi } from "../lib/api";
import { For, Show, createSignal } from "solid-js";
import { ArrowLeft, Send, User } from "lucide-solid";

export const Route = createFileRoute("/topic/$topicId")({
  component: TopicPage,
});

function TopicPage() {
  const params = Route.useParams();
  
  const topic = createQuery(() => ({
    queryKey: ["topic", params().topicId],
    queryFn: () => forumApi.getTopic(params().topicId),
  }));

  const posts = createQuery(() => ({
    queryKey: ["posts", params().topicId],
    queryFn: () => forumApi.listPosts(params().topicId),
  }));

  const createPostMutation = createMutation(() => ({
    mutationFn: (data: { topicId: string; content: string; authorId: string }) => 
      forumApi.createPost(data),
    onSuccess: () => {
      posts.refetch();
    }
  }));

  const [content, setContent] = createSignal("");

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!content().trim() || createPostMutation.isPending) return;

    try {
      await createPostMutation.mutateAsync({
        topicId: params().topicId,
        content: content(),
        authorId: "anonymous", // For now
      });
      setContent("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div class="space-y-6">
      <Show when={topic.data}>
        {(t) => (
          <>
            <div class="flex items-center gap-4">
              <Link to="/category/$categoryId" params={{ categoryId: t().categoryId }} class="btn btn-ghost btn-sm gap-2">
                <ArrowLeft size={16} />
                Back to Category
              </Link>
            </div>

            <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h1 class="text-3xl font-bold text-gray-900">{t().title}</h1>
              <p class="text-sm text-gray-400 mt-2">
                Started by <span class="text-indigo-600 font-semibold">{t().authorId}</span> • {new Date(t()._creationTime).toLocaleDateString()}
              </p>
            </div>
          </>
        )}
      </Show>

      <div class="space-y-4">
        <For each={posts.data}>
          {(post) => (
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div class="bg-gray-50 p-4 md:w-48 border-b md:border-b-0 md:border-r border-gray-100 flex flex-row md:flex-col items-center gap-3">
                <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                  <User size={24} />
                </div>
                <div class="text-center md:mt-2">
                  <p class="font-bold text-gray-900 text-sm truncate w-32 md:w-full">{post.authorId}</p>
                  <p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Member</p>
                </div>
              </div>
              <div class="p-6 flex-1 flex flex-col justify-between">
                <div class="prose max-w-none text-gray-700">
                  {post.content}
                </div>
                <div class="mt-4 pt-4 border-t border-gray-50 text-[10px] text-gray-400">
                  Posted on {new Date(post._creationTime).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Reply Form */}
      <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-8">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Post a Reply</h3>
        <form onSubmit={handleSubmit} class="space-y-4">
          <textarea
            class="textarea textarea-bordered w-full h-32 focus:textarea-primary transition-all bg-gray-50 border-gray-200"
            placeholder="What's on your mind?"
            value={content()}
            onInput={(e) => setContent(e.currentTarget.value)}
          />
          <div class="flex justify-end">
            <button 
              type="submit" 
              class="btn btn-primary gap-2 rounded-xl"
              disabled={!content().trim() || createPostMutation.isPending}
            >
              <Show when={createPostMutation.isPending} fallback={<Send size={18} />}>
                <span class="loading loading-spinner loading-sm"></span>
              </Show>
              Post Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
