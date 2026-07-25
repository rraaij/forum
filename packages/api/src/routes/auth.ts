import { Hono } from "hono";
import { auth } from "../auth";
import type { AppEnv } from "../types";

// Better Auth handles all /api/auth/* routes. Chained so the route schema
// reaches the exported AppType (see routes/index.ts).
const authRoutes = new Hono<AppEnv>().all("/*", (c) => auth.handler(c.req.raw));

export { authRoutes };
