import { describe, expect, it } from "vitest";
import type { DomainError } from "../../src/modules/shared/errors";
import { parseQuoteSnapshot } from "../../src/modules/shared/quote-snapshot";

const valid = {
  version: 1,
  sourcePostId: "6f6dcbcf-2f3e-4c39-9a4a-111111111111",
  authorName: "Ramon",
  content: "Original text",
  createdAt: "2026-07-25T10:00:00.000Z",
};

describe("parseQuoteSnapshot", () => {
  it("accepts a valid v1 snapshot", () => {
    expect(parseQuoteSnapshot(valid)).toEqual(valid);
  });

  it("rejects unsupported versions and forged shapes", () => {
    const badInputs: unknown[] = [
      null,
      "quoted text",
      { ...valid, version: 2 },
      { ...valid, sourcePostId: "not-a-uuid" },
      { ...valid, authorName: "" },
      { ...valid, createdAt: "yesterday" },
    ];
    for (const input of badInputs) {
      try {
        parseQuoteSnapshot(input);
        expect.unreachable("accepted invalid snapshot");
      } catch (error) {
        expect((error as DomainError).code).toBe("INVALID_QUOTE_SNAPSHOT");
      }
    }
  });
});
