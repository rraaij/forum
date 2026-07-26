import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/env";

const valid = {
  POSTGRES_HOST: "localhost",
  POSTGRES_PORT: "55432",
  POSTGRES_DB: "forum_test",
  POSTGRES_USER: "forum",
  POSTGRES_PASSWORD: "forum",
  AUTH_SECRET: "x".repeat(32),
  APP_URL: "http://localhost:3101",
  API_URL: "http://localhost:4100",
};

describe("startup environment schema", () => {
  it("accepts a complete environment", () => {
    expect(parseEnv(valid).POSTGRES_PORT).toBe(55432);
  });

  it("rejects a missing AUTH_SECRET — there is no fallback anymore", () => {
    const { AUTH_SECRET: _, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/AUTH_SECRET/);
  });

  it("rejects an AUTH_SECRET shorter than 32 characters", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(
      /at least 32 characters/,
    );
  });

  it("rejects missing database variables and invalid URLs", () => {
    expect(() => parseEnv({ ...valid, POSTGRES_DB: "" })).toThrow(
      /POSTGRES_DB/,
    );
    expect(() => parseEnv({ ...valid, POSTGRES_PORT: "abc" })).toThrow(
      /POSTGRES_PORT/,
    );
    expect(() => parseEnv({ ...valid, APP_URL: "not-a-url" })).toThrow(
      /APP_URL/,
    );
  });
});
