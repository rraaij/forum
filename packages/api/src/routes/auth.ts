import { Hono } from "hono";
import { auth } from "../auth";
import type { AppEnv } from "../types";

const authRoutes = new Hono<AppEnv>();

// Better Auth handles all /api/auth/* routes
authRoutes.all("/*", (c) => auth.handler(c.req.raw));

export { authRoutes };
