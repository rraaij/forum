import { createFileRoute, Link } from "@tanstack/solid-router";
import { createQuery } from "@tanstack/solid-query";
import { forumApi } from "../lib/api";
import { For, Show } from "solid-js";
import { ChevronRight, FolderIcon, MessageSquare, Plus, ArrowLeft } from "lucide-solid";

export const Route = createFileRoute("/category/$categoryId")({
  component: CategoryPage,
});

function CategoryPage() {
  const params = Route.useParams();
  
  const category = createQuery(() => ({
    queryKey: ["category", params().categoryId],
    queryFn: () => forumApi.getCategory(params().categoryId),
  }));

  const subcategories = createQuery(() => ({
    queryKey: ["subcategories", params().categoryId],
    queryFn: () => forumApi.listCategories(params().categoryId),
  }));

  const topics = createQuery(() => ({
    queryKey: ["topics", params().categoryId],
    queryFn: () => forumApi.listTopics(params().categoryId),
  }));

  return (
    <div class="space-y-6">
      <div class="flex items-center gap-4">
        <Link to="/" class="btn btn-ghost btn-sm gap-2">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <Show when={category.data}>
        {(cat) => (
          <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h1 class="text-4xl font-bold text-gray-900">{cat().title}</h1>
            <p class="text-gray-500 mt-2 text-lg">{cat().description}</p>
          </div>
        )}
      </Show>

      {/* Subcategories */}
      <Show when={subcategories.data && subcategories.data.length > 0}>
        <div class="space-y-4">
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FolderIcon size={20} class="text-blue-500" />
            Subcategories
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={subcategories.data}>
              {(sub) => (
                <Link
                  to="/category/$categoryId"
                  params={{ categoryId: sub._id }}
                  class="group flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
                >
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FolderIcon size={18} />
                    </div>
                    <div>
                      <h3 class="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {sub.title}
                      </h3>
                    </div>
                  </div>
                  <ChevronRight size={18} class="text-gray-300 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all" />
                </Link>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Topics */}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare size={20} class="text-indigo-500" />
            Topics
          </h2>
          <button class="btn btn-primary btn-sm gap-2 rounded-full">
            <Plus size={16} />
            New Topic
          </button>
        </div>

        <Show 
          when={topics.data && topics.data.length > 0} 
          fallback={
            <div class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p class="text-gray-500">No topics yet. Start the discussion!</p>
            </div>
          }
        >
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <For each={topics.data}>
              {(topic) => (
                <Link
                  to="/topic/$topicId"
                  params={{ topicId: topic._id }}
                  class="block p-4 border-b last:border-b-0 border-gray-50 hover:bg-gray-50 transition-colors group"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {topic.title}
                      </h3>
                      <p class="text-xs text-gray-400 mt-1">
                        Started by <span class="text-gray-600 font-medium">{topic.authorId}</span> • {new Date(topic._creationTime).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight size={18} class="text-gray-300 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
