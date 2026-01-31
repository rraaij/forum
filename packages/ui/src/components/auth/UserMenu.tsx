import { useAuthActions } from "@convex-dev/auth/solid";
import { api } from "@forum/db/convex/_generated/api";
import { useQuery } from "convex-solidjs";
import { LogOut, User } from "lucide-solid";
import { createSignal } from "solid-js";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const [isOpen, setIsOpen] = createSignal(false);
  const user = useQuery(api.users.viewer);

  // If not logged in, don't show user menu (or show login button)
  // This component assumes it's used where we might be logged in.
  // We can let the parent decide, or return null if !user.data()

  return (
    <div class="relative">
      <button
        onClick={() => setIsOpen(!isOpen())}
        class="btn btn-ghost btn-circle avatar placeholder"
      >
        <div class="bg-indigo-100 text-indigo-600 rounded-full w-10">
          <User size={20} />
        </div>
      </button>
      {isOpen() && (
        <>
          <button
            class="fixed inset-0 z-40 bg-transparent border-0 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            type="button"
          />
          <div class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div class="p-4 border-b border-gray-100">
              <p class="font-semibold text-gray-900 truncate">
                {user.data()?.email || "User"}
              </p>
              <p class="text-xs text-gray-500 capitalize">
                {user.data()?.role || "Member"}
              </p>
            </div>
            <ul class="py-1">
              <li>
                <button class="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors">
                  <User size={18} class="text-gray-400" />
                  Profile
                </button>
              </li>
              <li>
                <button
                  onClick={() => signOut()}
                  class="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
