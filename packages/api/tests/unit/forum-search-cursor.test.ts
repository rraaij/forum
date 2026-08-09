import { describe, expect, it } from "vitest";
import {
  decodeSearchCursor,
  encodeSearchCursor,
  searchFingerprint,
} from "../../src/modules/forum-search/cursor";
import type { DomainError } from "../../src/modules/shared/errors";

const fingerprint = searchFingerprint({
  q: "keyset pagination",
  topicsOnly: false,
  latestMonth: false,
  sort: "newest",
});

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return (error as DomainError).code;
  }
}

describe("forum search cursor", () => {
  it("round-trips a versioned newest cursor", () => {
    const encoded = encodeSearchCursor({
      fingerprint,
      sort: "newest",
      matchedAt: "2026-08-10T10:00:00.000Z",
      topicId: "11111111-1111-4111-8111-111111111111",
      cutoff: null,
    });
    expect(decodeSearchCursor(encoded, fingerprint, "newest")).toMatchObject({
      version: 1,
      fingerprint,
      sort: "newest",
    });
  });

  it("rejects malformed and noncanonical encodings", () => {
    expect(
      errorCode(() => decodeSearchCursor("***", fingerprint, "newest")),
    ).toBe("INVALID_CURSOR");
  });

  it("binds cursors to the query and sort", () => {
    const encoded = encodeSearchCursor({
      fingerprint,
      sort: "newest",
      matchedAt: "2026-08-10T10:00:00.000Z",
      topicId: "11111111-1111-4111-8111-111111111111",
      cutoff: null,
    });
    expect(
      errorCode(() => decodeSearchCursor(encoded, "x".repeat(24), "newest")),
    ).toBe("INVALID_CURSOR");
    expect(
      errorCode(() => decodeSearchCursor(encoded, fingerprint, "relevance")),
    ).toBe("INVALID_CURSOR");
  });
});
