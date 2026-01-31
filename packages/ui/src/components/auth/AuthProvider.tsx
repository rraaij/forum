import { ConvexClient } from "convex/browser";
import { ConvexProvider } from "convex-solidjs";
import type { JSX } from "solid-js";

// Get Convex URL from environment
const convexUrl =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { VITE_CONVEX_URL?: string } }).env
      ?.VITE_CONVEX_URL) ||
  "";

// Create client only on client-side (not during SSR)
let convexClient: ConvexClient | null = null;
if (typeof window !== "undefined" && convexUrl) {
  convexClient = new ConvexClient(convexUrl);
}

export function AuthProvider(props: { children: JSX.Element }) {
  // During SSR or if no client, just render children
  if (!convexClient) {
    return props.children;
  }

  return (
    <ConvexProvider client={convexClient}>{props.children}</ConvexProvider>
  );
}
