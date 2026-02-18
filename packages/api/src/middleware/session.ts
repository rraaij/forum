import type { Context, Next } from "hono";
import { auth } from "../auth";
import type { AppEnv } from "../types";

export async function sessionMiddleware(c: Context<AppEnv>, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session) {
    // Better Auth user + custom fields from DB (role is in users table)
    c.set("user", session.user as AppEnv["Variables"]["user"]);
    c.set("session", session.session);
  }

  await next();
}
