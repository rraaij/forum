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
import { closeTestSql, testSql, truncateAll } from "../helpers/db";

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
  it.each([
    ["POST", "/api/topics", { title: "t", content: "c" }],
    ["POST", "/api/posts", { topicId: "x", content: "c" }],
    ["POST", "/api/reactions", { postId: "x", emoji: "👍" }],
    ["POST", "/api/votes", { postId: "x", value: 1 }],
  ])("%s %s", async (method, path, body) => {
    const res = await app.request(path, json(method, body));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
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

describe("adminGuard returns 403 for missing and non-admin actors", () => {
  it("missing actor", async () => {
    const res = await app.request(
      "/api/admin/categories",
      json("POST", { name: "General", abbreviation: "GEN" }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("signed-in non-admin actor", async () => {
    const user = await signUpUser(app, "regular");
    const res = await app.request(
      "/api/admin/categories",
      json("POST", { name: "General", abbreviation: "GEN" }, user.cookie),
    );
    expect(res.status).toBe(403);
  });

  it("admin actor passes the guard", async () => {
    const user = await signUpUser(app, "admin-user");
    await makeAdmin(user.id);
    const res = await app.request(
      "/api/admin/categories",
      json(
        "POST",
        { name: "General", slug: "general", abbreviation: "GEN" },
        user.cookie,
      ),
    );
    expect(res.status).toBe(201);
  });
});

describe("topic and post rules", () => {
  async function createTopicFixture() {
    const author = await signUpUser(app, "author");
    await makeAdmin(author.id);
    const categoryRes = await app.request(
      "/api/admin/categories",
      json(
        "POST",
        { name: "General", slug: "general", abbreviation: "GEN" },
        author.cookie,
      ),
    );
    const category = await categoryRes.json();
    const topicRes = await app.request(
      "/api/topics",
      json(
        "POST",
        { categoryId: category.id, title: "Hello world", content: "First!" },
        author.cookie,
      ),
    );
    expect(topicRes.status).toBe(201);
    return { author, topic: await topicRes.json() };
  }

  it("locked topics reject replies with 403", async () => {
    const { author, topic } = await createTopicFixture();
    await testSql()`UPDATE topics SET is_locked = true WHERE id = ${topic.id}`;
    const res = await app.request(
      "/api/posts",
      json("POST", { topicId: topic.id, content: "reply" }, author.cookie),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Topic is locked" });
  });

  it("non-authors cannot edit posts (403) and admins can delete", async () => {
    const { author, topic } = await createTopicFixture();
    const replyRes = await app.request(
      "/api/posts",
      json("POST", { topicId: topic.id, content: "reply" }, author.cookie),
    );
    const reply = await replyRes.json();

    const other = await signUpUser(app, "other");
    const editRes = await app.request(
      `/api/posts/${reply.id}`,
      json("PUT", { content: "hijack" }, other.cookie),
    );
    expect(editRes.status).toBe(403);

    const deleteRes = await app.request(`/api/posts/${reply.id}`, {
      method: "DELETE",
      headers: { Cookie: other.cookie },
    });
    expect(deleteRes.status).toBe(403);

    await makeAdmin(other.id);
    const adminDelete = await app.request(`/api/posts/${reply.id}`, {
      method: "DELETE",
      headers: { Cookie: other.cookie },
    });
    expect(adminDelete.status).toBe(200);
    expect(await adminDelete.json()).toEqual({ success: true });
  });
});
