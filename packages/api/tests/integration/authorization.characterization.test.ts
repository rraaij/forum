/*
 * Characterization tests: the CURRENT authorization status codes, recorded
 * before the refactor. The redesign intends to retain these behaviors
 * (plan section 6): 401 for missing actors on authenticated routes, 403 from
 * adminGuard for both missing and non-admin actors, 403 for non-author edits
 * and locked topics.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { makeAdmin, signUpUser } from "../helpers/auth";
import { closeTestSql, truncateAll } from "../helpers/db";

const app = createApp();

function json(method: string, body: unknown, cookie?: string) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  };
}

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestSql();
});

describe("unauthenticated writes return 401", () => {
  // Still-legacy endpoints keep the legacy { error: string } shape.
  it.each([
    ["POST", "/api/reactions", { postId: "x", emoji: "👍" }],
    ["POST", "/api/votes", { postId: "x", value: 1 }],
  ])("%s %s", async (method, path, body) => {
    const res = await app.request(path, json(method, body));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  // Replaced topic/post writes use the standard envelope since Phase 4.
  it.each([
    ["POST", "/api/topics", { title: "t", content: "c" }],
    [
      "PATCH",
      "/api/posts/6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      { content: "c" },
    ],
  ])("%s %s (envelope)", async (method, path, body) => {
    const res = await app.request(path, json(method, body));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/profile and PATCH /api/profile", async () => {
    expect((await app.request("/api/profile")).status).toBe(401);
    expect((await app.request("/api/profile", json("PATCH", {}))).status).toBe(
      401,
    );
    expect(
      (await app.request("/api/profile/avatar", json("PATCH", {}))).status,
    ).toBe(401);
    expect((await app.request("/api/profile/activity")).status).toBe(401);
  });
});

/*
 * The admin guard keeps its historical contract on the replacement board
 * routes: a MISSING actor and a signed-in NON-ADMIN both receive 403 (never
 * 401), so admin routes never disclose that authentication alone would have
 * sufficed. Only the body shape moved to the standard envelope.
 */
describe("admin guard returns 403 for missing and non-admin actors", () => {
  const board = {
    parentId: null,
    name: "General",
    slug: "general",
    abbreviation: "GEN",
  };

  it("missing actor", async () => {
    const res = await app.request("/api/admin/boards", json("POST", board));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("signed-in non-admin actor", async () => {
    const user = await signUpUser(app, "regular");
    const res = await app.request(
      "/api/admin/boards",
      json("POST", board, user.cookie),
    );
    expect(res.status).toBe(403);
  });

  it("admin actor passes the guard", async () => {
    const user = await signUpUser(app, "admin-user");
    await makeAdmin(user.id);
    const res = await app.request(
      "/api/admin/boards",
      json("POST", board, user.cookie),
    );
    expect(res.status).toBe(201);
  });
});

/*
 * The former "topic and post rules" characterization block is retired: the
 * legacy topic/post handlers were replaced in Phase 4, and the replacement
 * behavior (locked topics, author-only edits, admin deletes) is covered by
 * topic-discussion.http.test.ts and topic-discussion.module.test.ts.
 */
