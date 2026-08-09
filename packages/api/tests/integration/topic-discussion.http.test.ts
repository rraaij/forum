/*
 * HTTP contract tests for the replacement topic-discussion adapters. Built
 * unmounted in Phase 3; mounted through the real app since the Phase 4
 * swap. Every error uses the standard envelope
 * { error: { code, message, field? } }.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { makeAdmin, signUpUser, type TestUser } from "../helpers/auth";
import { closeTestSql, testSql, truncateAll } from "../helpers/db";
import { insertBoard } from "../helpers/fixtures";

// Since the Phase 4 swap these adapters are MOUNTED: contract-test them
// through the real app composition.
const app = createApp();

let user: TestUser;
let boardId: string;

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

async function createTopic(): Promise<{
  topicId: string;
  slug: string;
  routeParams:
    | { kind: "rootTopic"; categorySlug: string; topicSlug: string }
    | {
        kind: "boardTopic";
        categorySlug: string;
        boardId: string;
        topicSlug: string;
      };
}> {
  const res = await app.request(
    "/api/topics",
    json(
      "POST",
      { boardId, title: "Contract topic", content: "opening" },
      user.cookie,
    ),
  );
  expect(res.status).toBe(201);
  return res.json();
}

beforeEach(async () => {
  await truncateAll();
  user = await signUpUser(app, "http-user");
  boardId = await insertBoard("General");
});

afterAll(async () => {
  await closeTestSql();
});

describe("replacement topic routes", () => {
  it("401 envelope for unauthenticated writes", async () => {
    const res = await app.request(
      "/api/topics",
      json("POST", { boardId, title: "abc", content: "x" }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });
  });

  it("400 envelope with field before any transaction starts", async () => {
    const res = await app.request(
      "/api/topics",
      json(
        "POST",
        { boardId: "nope", title: "abc", content: "x" },
        user.cookie,
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.field).toBe("boardId");
    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM topics
    `;
    expect(count).toBe(0);
  });

  it("returns the standard envelope for malformed JSON", async () => {
    const res = await app.request("/api/topics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: user.cookie,
      },
      body: '{"title":',
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Malformed JSON in request body",
      },
    });
    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM topics
    `;
    expect(count).toBe(0);
  });

  it("413 envelope for oversized bodies, with no rows created", async () => {
    const res = await app.request(
      "/api/topics",
      json(
        "POST",
        { boardId, title: "abc", content: "x".repeat(70_000) },
        user.cookie,
      ),
    );
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("BODY_TOO_LARGE");
    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM topics
    `;
    expect(count).toBe(0);
  });

  it("creates topics (201) and maps slug conflicts to 409", async () => {
    const { topicId, slug, routeParams } = await createTopic();
    expect(slug).toBe("contract-topic");
    expect(topicId).toMatch(/^[0-9a-f-]{36}$/);
    expect(routeParams).toEqual({
      kind: "rootTopic",
      categorySlug: "general",
      topicSlug: "contract-topic",
    });

    const conflict = await app.request(
      "/api/topics",
      json(
        "POST",
        { boardId, title: "CONTRACT topic!", content: "y" },
        user.cookie,
      ),
    );
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error.code).toBe("TOPIC_SLUG_CONFLICT");
  });

  it("blocks members but lets staff create topics on a restricted board", async () => {
    await testSql()`
      UPDATE boards SET allow_new_topics = false WHERE id = ${boardId}
    `;
    const input = { boardId, title: "Restricted", content: "opening" };
    const blocked = await app.request(
      "/api/topics",
      json("POST", input, user.cookie),
    );
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).error.code).toBe("NEW_TOPICS_DISABLED");

    await makeAdmin(user.id);
    const allowed = await app.request(
      "/api/topics",
      json("POST", input, user.cookie),
    );
    expect(allowed.status).toBe(201);
  });

  it("replies via the nested route and maps locked topics to 403", async () => {
    const { topicId } = await createTopic();
    const reply = await app.request(
      `/api/topics/${topicId}/replies`,
      json("POST", { content: "a reply" }, user.cookie),
    );
    expect(reply.status).toBe(201);

    await testSql()`UPDATE topics SET is_locked = true WHERE id = ${topicId}`;
    const locked = await app.request(
      `/api/topics/${topicId}/replies`,
      json("POST", { content: "rejected" }, user.cookie),
    );
    expect(locked.status).toBe(403);
    expect((await locked.json()).error.code).toBe("TOPIC_LOCKED");
  });

  it("ignores forged quote snapshot fields from the client", async () => {
    const { topicId } = await createTopic();
    const [opening] = await testSql()`
      SELECT id, content FROM posts WHERE topic_id = ${topicId}
    `;
    const res = await app.request(
      `/api/topics/${topicId}/replies`,
      json(
        "POST",
        {
          content: "quoting",
          quotedPostId: opening.id,
          // Forged fields: the transport schema strips them; the module
          // rebuilds the snapshot from the source row.
          quoteSnapshot: {
            version: 1,
            sourcePostId: opening.id,
            authorName: "FORGED",
            content: "FORGED CONTENT",
            createdAt: "1999-01-01T00:00:00.000Z",
          },
        },
        user.cookie,
      ),
    );
    expect(res.status).toBe(201);
    const { postId } = await res.json();
    const [stored] = await testSql()`
      SELECT quote_snapshot FROM posts WHERE id = ${postId}
    `;
    expect(stored.quote_snapshot.authorName).toBe("http-user");
    expect(stored.quote_snapshot.content).toBe(opening.content);
  });

  it("records views once per session without authentication", async () => {
    const { topicId } = await createTopic();
    const session = "44444444-4444-4444-8444-444444444444";
    const first = await app.request(
      `/api/topics/${topicId}/views`,
      json("POST", { browserSessionId: session }),
    );
    expect(await first.json()).toEqual({ counted: true });
    const second = await app.request(
      `/api/topics/${topicId}/views`,
      json("POST", { browserSessionId: session }),
    );
    expect(await second.json()).toEqual({ counted: false });
  });
});

describe("replacement post routes", () => {
  it("edits (204), forbids non-authors (403), and deletes idempotently", async () => {
    const { topicId } = await createTopic();
    const replyRes = await app.request(
      `/api/topics/${topicId}/replies`,
      json("POST", { content: "editable" }, user.cookie),
    );
    const { postId } = await replyRes.json();

    const edited = await app.request(
      `/api/posts/${postId}`,
      json("PATCH", { content: "edited" }, user.cookie),
    );
    expect(edited.status).toBe(204);

    const other = await signUpUser(app, "http-other");
    const forbidden = await app.request(
      `/api/posts/${postId}`,
      json("PATCH", { content: "hijack" }, other.cookie),
    );
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error.code).toBe("NOT_POST_AUTHOR");

    const del = await app.request(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { Cookie: user.cookie },
    });
    expect(await del.json()).toEqual({ alreadyDeleted: false });
    const again = await app.request(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { Cookie: user.cookie },
    });
    expect(await again.json()).toEqual({ alreadyDeleted: true });
  });

  it("404 envelope for unknown posts and malformed UUID params", async () => {
    const missing = await app.request(
      "/api/posts/6f6dcbcf-2f3e-4c39-9a4a-999999999999",
      json("PATCH", { content: "x" }, user.cookie),
    );
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("POST_NOT_FOUND");

    const malformed = await app.request(
      "/api/posts/not-a-uuid",
      json("PATCH", { content: "x" }, user.cookie),
    );
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("INVALID_INPUT");
  });
});
