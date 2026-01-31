import { api } from "@forum/db/convex/_generated/api";
import { Link } from "@tanstack/solid-router";
import { useQuery } from "convex-solidjs";
import { Home, Layers, Menu, X } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Login } from "./auth/Login";
import { UserMenu } from "./auth/UserMenu";

export default function Header() {
  const [isOpen, setIsOpen] = createSignal(false);
  const user = useQuery(api.users.viewer);

  return (
    <>
      <header class="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
        <div class="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 class="ml-4 text-xl font-semibold">
            <Link to="/">
              <span class="text-2xl font-black [letter-spacing:-0.08em] text-white">
                FORUM<span class="text-indigo-500">APP</span>
              </span>
            </Link>
          </h1>
        </div>

        <div class="flex items-center gap-4">
          <Show when={user.data()} fallback={<Login />}>
            <UserMenu />
          </Show>
        </div>
      </header>

      <aside
        class={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen() ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 class="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav class="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              class:
                "flex items-center gap-3 p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors mb-2",
            }}
          >
            <Home size={20} />
            <span class="font-medium">Home</span>
          </Link>

          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              class:
                "flex items-center gap-3 p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors mb-2",
            }}
          >
            <Layers size={20} />
            <span class="font-medium">All Categories</span>
          </Link>
        </nav>

        <div class="p-4 border-t border-gray-700 bg-gray-800 text-center text-xs text-gray-400">
          &copy; 2026 Forum Monorepo
        </div>
      </aside>
    </>
  );
}
