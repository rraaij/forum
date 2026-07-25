/*
 * Phase 0 behavior CHANGE, made explicit: legacy write endpoints now runtime-
 * validate inputs with bounded Zod schemas (plan section 6.1) before any
 * database work. Malformed UUIDs and out-of-bounds values that previously
 * surfaced as 500s (or were silently accepted) now return 400; oversized
 * bodies return 413. Authentication still wins over validation (401 first),
 * which the characterization tests pin separately.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { makeAdmin, signUpUser, type TestUser } from "../helpers/auth";
import { closeTestSql, truncateAll } from "../helpers/db";

const app = createApp();
let admin: TestUser;

function post(path: string, body: unknown, method = "POST") {
  return app.request(path, {
    method,
    headers: { "Content-Type": "application/json", Cookie: admin.cookie },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await truncateAll();
  admin = await signUpUser(app, "validator-admin");
  await makeAdmin(admin.id);
});

afterAll(async () => {
  await closeTestSql();
});

describe("legacy write validation", () => {
  it("rejects malformed UUIDs with 400 instead of a database error", async () => {
    const reply = await post("/api/posts", {
      topicId: "not-a-uuid",
      content: "hello",
    });
    expect(reply.status).toBe(400);
    expect((await reply.json()).error).toBe("topicId must be a valid ID");

    const edit = await post("/api/posts/not-a-uuid", { content: "x" }, "PUT");
    expect(edit.status).toBe(400);

    const reaction = await post("/api/reactions", {
      postId: "nope",
      emoji: "👍",
    });
    expect(reaction.status).toBe(400);
  });

  it("bounds topic titles to 3..200 characters after trimming", async () => {
    const short = await post("/api/topics", {
      categoryId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      title: "  ab ",
      content: "body",
    });
    expect(short.status).toBe(400);
    expect((await short.json()).error).toBe(
      "title must contain at least 3 characters",
    );

    const long = await post("/api/topics", {
      categoryId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      title: "x".repeat(201),
      content: "body",
    });
    expect(long.status).toBe(400);
  });

  it("requires exactly one topic parent", async () => {
    const neither = await post("/api/topics", { title: "abc", content: "x" });
    expect(neither.status).toBe(400);
    expect((await neither.json()).error).toBe(
      "categoryId or subcategoryId is required",
    );

    const both = await post("/api/topics", {
      categoryId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      subcategoryId: "6f6dcbcf-2f3e-4c39-9a4a-222222222222",
      title: "abc",
      content: "x",
    });
    expect(both.status).toBe(400);
    expect((await both.json()).error).toBe(
      "Provide categoryId or subcategoryId, not both",
    );
  });

  it("bounds reaction emoji to 32 code points", async () => {
    const res = await post("/api/reactions", {
      postId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      emoji: "👍".repeat(33),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "emoji must contain at most 32 characters",
    );
  });

  it("keeps the legacy vote value message", async () => {
    const res = await post("/api/votes", {
      postId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      value: 0,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("value must be 1 or -1");
  });

  it("rejects bodies over 64 KiB on normal writes with 413", async () => {
    const res = await post("/api/posts", {
      topicId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      content: "x".repeat(70_000),
    });
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe("Request body too large");
  });

  it("bounds post content to 50k characters (under the body limit)", async () => {
    const res = await post("/api/posts", {
      topicId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      content: "x".repeat(50_001),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "content must contain at most 50000 characters",
    );
  });

  it("rejects negative admin sortOrder", async () => {
    const res = await post("/api/admin/categories", {
      name: "Sorted",
      slug: "sorted",
      abbreviation: "SRT",
      sortOrder: -1,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "sortOrder must be a non-negative integer",
    );
  });

  it("rejects non-JSON bodies with 400", async () => {
    const res = await app.request("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: admin.cookie },
      body: "not json {",
    });
    expect(res.status).toBe(400);
  });
});
