import type { Hono } from "hono";
import type { AppEnv } from "../../src/types";
import { testSql } from "./db";

export interface TestUser {
  id: string;
  email: string;
  cookie: string;
}

/*
 * Creates a user through the real Better Auth sign-up endpoint so the
 * password hashing, session issuance, and cookie flags all match production
 * behavior. Returns the Cookie header value for authenticated requests.
 */
export async function signUpUser(
  app: Hono<AppEnv>,
  name: string,
): Promise<TestUser> {
  const email = `${name}@example.test`;
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "test-password-123" }),
  });
  if (res.status !== 200) {
    throw new Error(`sign-up failed (${res.status}): ${await res.text()}`);
  }

  const cookie = res.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("sign-up returned no session cookie");

  const rows = await testSql()`
    SELECT id FROM users WHERE email = ${email}
  `;
  const id = rows[0]?.id as string;
  if (!id) throw new Error("sign-up did not create a users row");

  return { id, email, cookie };
}

export async function makeAdmin(userId: string): Promise<void> {
  await testSql()`UPDATE users SET role = 'admin' WHERE id = ${userId}`;
}
