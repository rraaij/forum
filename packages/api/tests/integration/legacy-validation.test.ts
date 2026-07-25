/*
 * Runtime validation on the endpoints that are STILL legacy after the
 * Phase 4 swap: reactions, votes, and admin category/subcategory mutations
 * (replaced in Phase 5). Topic/post validation now lives in
 * topic-discussion.http.test.ts against the replacement adapters.
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
    const reaction = await post("/api/reactions", {
      postId: "nope",
      emoji: "👍",
    });
    expect(reaction.status).toBe(400);
    expect((await reaction.json()).error).toBe("postId must be a valid ID");
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

  it("rejects bodies over 64 KiB on legacy writes with 413", async () => {
    const res = await post("/api/votes", {
      postId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
      value: 1,
      padding: "x".repeat(70_000),
    });
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe("Request body too large");
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
