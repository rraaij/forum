import { createAuthClient } from "better-auth/solid";

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

export type SessionUser = (typeof authClient.$Infer.Session)["user"] & {
  role: "user" | "moderator" | "admin";
};

export const useSession = authClient.useSession;
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
