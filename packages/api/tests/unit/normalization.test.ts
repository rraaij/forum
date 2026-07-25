import { describe, expect, it } from "vitest";
import {
  normalizeBoardAbbreviation,
  normalizeBoardDescription,
  normalizeBoardIcon,
  normalizeBoardName,
  normalizeBoardSlug,
  normalizeSortOrder,
} from "../../src/modules/board-management/normalization";
import type { DomainError } from "../../src/modules/shared/errors";
import {
  generateTopicSlug,
  normalizePostContent,
  normalizeTopicTitle,
} from "../../src/modules/topic-discussion/validation";

function fieldOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return (error as DomainError).field;
  }
  return undefined;
}

describe("board normalization", () => {
  it("trims names and rejects empty/oversized ones with the field name", () => {
    expect(normalizeBoardName("  General  ")).toBe("General");
    expect(fieldOf(() => normalizeBoardName("   "))).toBe("name");
    expect(fieldOf(() => normalizeBoardName("x".repeat(201)))).toBe("name");
  });

  it("lowercases slugs and rejects invalid shapes", () => {
    expect(normalizeBoardSlug("  General-Talk ")).toBe("general-talk");
    for (const bad of [
      "",
      "  ",
      "spaces here",
      "Ümlaut",
      "-lead",
      "trail-",
      "a--b",
    ]) {
      expect(fieldOf(() => normalizeBoardSlug(bad))).toBe("slug");
    }
  });

  it("uppercases abbreviations and enforces 1..5", () => {
    expect(normalizeBoardAbbreviation(" gen ")).toBe("GEN");
    expect(fieldOf(() => normalizeBoardAbbreviation("  "))).toBe(
      "abbreviation",
    );
    expect(fieldOf(() => normalizeBoardAbbreviation("TOOLONG"))).toBe(
      "abbreviation",
    );
  });

  it("turns empty descriptions and icons into null", () => {
    expect(normalizeBoardDescription("  ")).toBeNull();
    expect(normalizeBoardDescription(undefined)).toBeNull();
    expect(normalizeBoardDescription(" hi ")).toBe("hi");
    expect(normalizeBoardIcon(null)).toBeNull();
    expect(normalizeBoardIcon(" 🎯 ")).toBe("🎯");
  });

  it("defaults sort order to 0 and rejects negatives and floats", () => {
    expect(normalizeSortOrder(undefined)).toBe(0);
    expect(normalizeSortOrder(7)).toBe(7);
    expect(fieldOf(() => normalizeSortOrder(-1))).toBe("sortOrder");
    expect(fieldOf(() => normalizeSortOrder(1.5))).toBe("sortOrder");
  });
});

describe("topic field normalization", () => {
  it("bounds titles to 3..200 after trimming", () => {
    expect(normalizeTopicTitle("  Hello world  ")).toBe("Hello world");
    expect(fieldOf(() => normalizeTopicTitle(" ab "))).toBe("title");
    expect(fieldOf(() => normalizeTopicTitle("x".repeat(201)))).toBe("title");
  });

  it("bounds content to 1..50000 after trimming", () => {
    expect(normalizePostContent(" hi ")).toBe("hi");
    expect(fieldOf(() => normalizePostContent("   "))).toBe("content");
    expect(fieldOf(() => normalizePostContent("x".repeat(50_001)))).toBe(
      "content",
    );
  });

  it("generates non-empty slugs and rejects titles that reduce to nothing", () => {
    expect(generateTopicSlug("Hello, World!")).toBe("hello-world");
    expect(generateTopicSlug("  Multi   space  ")).toBe("multi-space");
    expect(fieldOf(() => generateTopicSlug("!!!"))).toBe("title");
  });
});
