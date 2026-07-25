import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/modules/shared/errors";
import {
  DEFAULT_PAGE_LIMIT,
  decodeReplyCursor,
  decodeTopicCursor,
  encodeReplyCursor,
  encodeTopicCursor,
  MAX_PAGE_LIMIT,
  normalizePageLimit,
} from "../../src/modules/shared/pagination";

const TOPIC_ID = "6f6dcbcf-2f3e-4c39-9a4a-111111111111";

describe("normalizePageLimit", () => {
  it("defaults to 25 and enforces the hard maximum of 100", () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(25);
    expect(MAX_PAGE_LIMIT).toBe(100);
    expect(normalizePageLimit(undefined)).toBe(25);
    expect(normalizePageLimit(1)).toBe(1);
    expect(normalizePageLimit(100)).toBe(100);
  });

  it("rejects zero, negatives, floats, and values over 100", () => {
    for (const limit of [0, -1, 2.5, 101, Number.NaN]) {
      expect(() => normalizePageLimit(limit)).toThrowError(DomainError);
      try {
        normalizePageLimit(limit);
      } catch (error) {
        expect((error as DomainError).code).toBe("INVALID_PAGE_LIMIT");
        expect((error as DomainError).kind).toBe("validation");
      }
    }
  });
});

describe("topic cursors", () => {
  const payload = {
    isPinned: true,
    lastActivityAt: "2026-07-25T10:00:00.000Z",
    id: TOPIC_ID,
  };

  it("round-trips through opaque base64url", () => {
    const encoded = encodeTopicCursor(payload);
    expect(encoded).not.toContain("{");
    expect(decodeTopicCursor(encoded)).toEqual({ version: 1, ...payload });
  });

  it("rejects malformed, tampered, and unsupported-version cursors", () => {
    const badInputs = [
      "not-base64-json",
      Buffer.from("[1,2,3]").toString("base64url"),
      Buffer.from(JSON.stringify({ version: 2, ...payload })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({ version: 1, ...payload, id: "not-a-uuid" }),
      ).toString("base64url"),
      Buffer.from(
        JSON.stringify({ version: 1, ...payload, isPinned: "yes" }),
      ).toString("base64url"),
    ];
    for (const input of badInputs) {
      let caught: unknown;
      try {
        decodeTopicCursor(input);
      } catch (error) {
        caught = error;
      }
      expect(caught, `accepted bad cursor: ${input}`).toBeInstanceOf(
        DomainError,
      );
      expect((caught as DomainError).code).toBe("INVALID_CURSOR");
      expect((caught as DomainError).kind).toBe("validation");
    }
  });
});

describe("reply cursors", () => {
  it("round-trips and validates independently of topic cursors", () => {
    const encoded = encodeReplyCursor({
      createdAt: "2026-07-25T10:00:00.000Z",
      id: TOPIC_ID,
    });
    expect(decodeReplyCursor(encoded).version).toBe(1);
    // A topic cursor is not a valid reply cursor.
    const topicCursor = encodeTopicCursor({
      isPinned: false,
      lastActivityAt: "2026-07-25T10:00:00.000Z",
      id: TOPIC_ID,
    });
    expect(() => decodeReplyCursor(topicCursor)).toThrowError(DomainError);
  });
});
