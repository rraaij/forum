import { describe, expect, it } from "vitest";
import {
  conflictError,
  forbiddenError,
  notFoundError,
  unauthenticatedError,
  validationError,
} from "../../src/modules/shared/errors";
import { toErrorResponse } from "../../src/transport/error-envelope";
import {
  boardPageParamsSchema,
  createBoardBodySchema,
  createTopicBodySchema,
  moveBoardBodySchema,
  purgeBoardBodySchema,
  replyPageRequestQuerySchema,
  replyToTopicBodySchema,
  topicPageRequestQuerySchema,
  updateProfileBodySchema,
} from "../../src/transport/schemas";

const UUID = "6f6dcbcf-2f3e-4c39-9a4a-111111111111";

describe("error envelope mapper", () => {
  it("maps every domain error kind to its plan section 6 status", () => {
    expect(toErrorResponse(validationError("X", "m")).status).toBe(400);
    expect(toErrorResponse(unauthenticatedError()).status).toBe(401);
    expect(toErrorResponse(forbiddenError("X", "m")).status).toBe(403);
    expect(toErrorResponse(notFoundError("X", "m")).status).toBe(404);
    expect(toErrorResponse(conflictError("X", "m")).status).toBe(409);
  });

  it("produces the standard envelope, including field only when present", () => {
    expect(
      toErrorResponse(conflictError("BOARD_SIBLING_CONFLICT", "Taken", "slug"))
        .body,
    ).toEqual({
      error: {
        code: "BOARD_SIBLING_CONFLICT",
        message: "Taken",
        field: "slug",
      },
    });
    expect(
      "field" in
        toErrorResponse(notFoundError("TOPIC_NOT_FOUND", "m")).body.error,
    ).toBe(false);
  });
});

describe("replacement transport schemas", () => {
  it("rejects malformed UUIDs everywhere", () => {
    expect(
      createTopicBodySchema.safeParse({
        boardId: "nope",
        title: "abc",
        content: "x",
      }).success,
    ).toBe(false);
    expect(
      boardPageParamsSchema.safeParse({
        categorySlug: "general",
        boardId: "nope",
      }).success,
    ).toBe(false);
    expect(
      replyToTopicBodySchema.safeParse({ content: "x", quotedPostId: "nope" })
        .success,
    ).toBe(false);
  });

  it("enforces page limit bounds and defaults in query strings", () => {
    expect(
      topicPageRequestQuerySchema.parse({ topicLimit: "100" }).topicLimit,
    ).toBe(100);
    expect(
      topicPageRequestQuerySchema.safeParse({ topicLimit: "101" }).success,
    ).toBe(false);
    expect(
      replyPageRequestQuerySchema.safeParse({ replyCursor: "not/base64+url" })
        .success,
    ).toBe(false);
  });

  it("bounds topic titles and requires explicit parentId on board creation", () => {
    expect(
      createTopicBodySchema.safeParse({
        boardId: UUID,
        title: "ab",
        content: "x",
      }).success,
    ).toBe(false);
    const withoutParent = createBoardBodySchema.safeParse({
      name: "General",
      slug: "general",
      abbreviation: "GEN",
    });
    expect(withoutParent.success).toBe(false);
    expect(
      createBoardBodySchema.safeParse({
        parentId: null,
        name: "General",
        slug: "general",
        abbreviation: "GEN",
      }).success,
    ).toBe(true);
  });

  it("validates move and purge inputs", () => {
    expect(
      moveBoardBodySchema.safeParse({ newParentId: null, sortOrder: -1 })
        .success,
    ).toBe(false);
    expect(
      purgeBoardBodySchema.safeParse({
        confirmationName: "General",
        expectedImpact: {
          boards: 1,
          topics: 0,
          posts: 0,
          reactions: 0,
          votes: 0,
          topicViews: -1,
        },
      }).success,
    ).toBe(false);
  });

  it("keeps profile replacement semantics: photoUrls always required, max 12", () => {
    expect(updateProfileBodySchema.safeParse({}).success).toBe(false);
    expect(updateProfileBodySchema.safeParse({ photoUrls: [] }).success).toBe(
      true,
    );
    expect(
      updateProfileBodySchema.safeParse({
        photoUrls: Array.from({ length: 13 }, () => "x"),
      }).success,
    ).toBe(false);
    expect(
      updateProfileBodySchema.safeParse({
        dateOfBirth: "01-04-1990",
        photoUrls: [],
      }).success,
    ).toBe(false);
  });
});
