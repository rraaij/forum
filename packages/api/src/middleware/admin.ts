import type { Context, Next } from "hono";
import type { AppEnv } from "../types";

export async function adminGuard(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");

  // The optional chain intentionally treats a missing authenticated user the
  // same as a signed-in user without the required administrator role.
  if (user?.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
}
