import { ConvexAuthProvider } from "@convex-dev/auth/solid";
import { ConvexReactClient } from "convex/react";
import type { JSX } from "solid-js";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export function AuthProvider(props: { children: JSX.Element }) {
  return (
    <ConvexAuthProvider client={convex}>{props.children}</ConvexAuthProvider>
  );
}
