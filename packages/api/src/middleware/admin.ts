import type { Context, Next } from "hono";
import type { AppEnv } from "../types";

export async function adminGuard(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");

  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
}
