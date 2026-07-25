import { describe, expect, it } from "vitest";
import {
  assertSafeDbTarget,
  assertTargetsDiffer,
  type DbTarget,
  dbTargetFromEnv,
  describeDbTarget,
  parseEnvFile,
} from "../../src/safe-target";

const qnapTarget: DbTarget = {
  host: "192.168.0.178",
  port: 5433,
  database: "forum-db",
  user: "admin",
  password: "secret",
};

const testTarget: DbTarget = {
  host: "localhost",
  port: 55432,
  database: "forum_test",
  user: "forum",
  password: "forum",
};

describe("assertSafeDbTarget", () => {
  it("rejects the QNAP target for both modes", () => {
    expect(() => assertSafeDbTarget(qnapTarget, "test")).toThrow(/Refusing/);
    expect(() => assertSafeDbTarget(qnapTarget, "dev")).toThrow(/Refusing/);
  });

  it("rejects a loopback host with the wrong database suffix", () => {
    const wrongSuffix = { ...testTarget, database: "forum" };
    expect(() => assertSafeDbTarget(wrongSuffix, "test")).toThrow(/_test/);
    expect(() => assertSafeDbTarget(wrongSuffix, "dev")).toThrow(/_dev/);
  });

  it("rejects cross-mode suffixes so test commands cannot hit forum_dev", () => {
    const devDb = { ...testTarget, database: "forum_dev" };
    expect(() => assertSafeDbTarget(devDb, "test")).toThrow(/_test/);
    expect(() => assertSafeDbTarget(testTarget, "dev")).toThrow(/_dev/);
  });

  it("accepts loopback targets with the matching suffix", () => {
    expect(() => assertSafeDbTarget(testTarget, "test")).not.toThrow();
    expect(() =>
      assertSafeDbTarget(
        { ...testTarget, host: "127.0.0.1", database: "forum_dev" },
        "dev",
      ),
    ).not.toThrow();
  });

  it("rejects hosts that merely resolve to loopback", () => {
    const aliased = { ...testTarget, host: "local.test" };
    expect(() => assertSafeDbTarget(aliased, "test")).toThrow(/Refusing/);
  });
});

describe("assertTargetsDiffer", () => {
  it("rejects a test target identical to the normal .env target", () => {
    expect(() => assertTargetsDiffer(testTarget, { ...testTarget })).toThrow(
      /same host, port, and database/,
    );
  });

  it("accepts a target that differs by port or database", () => {
    expect(() =>
      assertTargetsDiffer(testTarget, { ...testTarget, port: 5433 }),
    ).not.toThrow();
    expect(() =>
      assertTargetsDiffer(testTarget, { ...testTarget, database: "forum" }),
    ).not.toThrow();
  });
});

describe("dbTargetFromEnv", () => {
  it("requires every connection variable", () => {
    expect(() => dbTargetFromEnv({})).toThrow(/incomplete/);
    expect(() =>
      dbTargetFromEnv({
        POSTGRES_HOST: "localhost",
        POSTGRES_PORT: "not-a-port",
        POSTGRES_DB: "forum_test",
        POSTGRES_USER: "forum",
        POSTGRES_PASSWORD: "forum",
      }),
    ).toThrow(/incomplete/);
  });
});

describe("describeDbTarget", () => {
  it("never includes the password", () => {
    expect(describeDbTarget(qnapTarget)).not.toContain("secret");
  });
});

describe("parseEnvFile", () => {
  it("parses KEY=VALUE lines, comments, and quotes", () => {
    const parsed = parseEnvFile(
      [
        "# comment",
        "POSTGRES_HOST=localhost",
        'POSTGRES_DB="forum_test"',
        "POSTGRES_PORT='55432'",
        "",
        "not a pair",
      ].join("\n"),
    );
    expect(parsed).toEqual({
      POSTGRES_HOST: "localhost",
      POSTGRES_DB: "forum_test",
      POSTGRES_PORT: "55432",
    });
  });
});
