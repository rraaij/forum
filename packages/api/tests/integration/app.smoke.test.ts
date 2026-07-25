import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { closeTestSql } from "../helpers/db";

const app = createApp();

afterAll(async () => {
  await closeTestSql();
});

describe("app smoke", () => {
  it("responds on /health without touching the database", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("reaches the database through /health/db", async () => {
    const res = await app.request("/health/db");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toContain("forum_test");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});
