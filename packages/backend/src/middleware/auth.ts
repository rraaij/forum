import { createMiddleware } from "hono/factory";
import type { Context } from "hono";

export type AuthEnv = {
  Variables: {
    userId?: string;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // In a real implementation, verify the JWT token
    // For now, we'll extract userId from the token payload
    try {
      // Basic JWT decode (in production, use proper verification)
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      c.set("userId", payload.sub);
    } catch (error) {
      // Invalid token, continue without userId
    }
  }

  await next();
});

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});
