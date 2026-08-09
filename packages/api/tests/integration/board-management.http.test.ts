/*
 * HTTP contract tests for /api/admin/boards (plan section 6). Every command
 * is guarded, runtime-validated, and maps domain errors to the standard
 * envelope. Mounted through the real app composition.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { makeAdmin, signUpUser, type TestUser } from "../helpers/auth";
import { closeTestSql, testSql, truncateAll } from "../helpers/db";

const app = createApp();
let admin: TestUser;
let member: TestUser;

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

async function createBoard(
  body: Record<string, unknown>,
): Promise<{ boardId: string }> {
  const res = await app.request(
    "/api/admin/boards",
    json("POST", body, admin.cookie),
  );
  expect(res.status).toBe(201);
  return res.json();
}

beforeEach(async () => {
  await truncateAll();
  admin = await signUpUser(app, "board-admin");
  await makeAdmin(admin.id);
  member = await signUpUser(app, "board-member");
});

afterAll(async () => {
  await closeTestSql();
});

describe("non-admins cannot invoke any board command", () => {
  it.each([
    ["POST", "/api/admin/boards", {}],
    ["PUT", "/api/admin/boards/order", { groups: [] }],
    ["PATCH", "/api/admin/boards/6f6dcbcf-2f3e-4c39-9a4a-111111111111", {}],
    [
      "POST",
      "/api/admin/boards/6f6dcbcf-2f3e-4c39-9a4a-111111111111/move",
      { newParentId: null, sortOrder: 0 },
    ],
    [
      "POST",
      "/api/admin/boards/6f6dcbcf-2f3e-4c39-9a4a-111111111111/purge",
      { confirmationName: "x", expectedImpact: {} },
    ],
  ])("%s %s", async (method, path, body) => {
    // Anonymous and signed-in non-admin alike: 403, never 401.
    const anonymous = await app.request(path, json(method, body));
    expect(anonymous.status).toBe(403);
    const signedIn = await app.request(path, json(method, body, member.cookie));
    expect(signedIn.status).toBe(403);
  });

  it("GET purge-impact is guarded too", async () => {
    const res = await app.request(
      "/api/admin/boards/6f6dcbcf-2f3e-4c39-9a4a-111111111111/purge-impact",
      { headers: { Cookie: member.cookie } },
    );
    expect(res.status).toBe(403);
  });
});

describe("board commands", () => {
  it("creates roots and children, and rejects conflicts with a field", async () => {
    const { boardId: rootId } = await createBoard({
      parentId: null,
      name: "General",
      slug: "general",
      abbreviation: "GEN",
    });
    await createBoard({
      parentId: rootId,
      name: "Nested",
      slug: "nested",
      abbreviation: "NST",
    });

    const conflict = await app.request(
      "/api/admin/boards",
      json(
        "POST",
        {
          parentId: null,
          name: "GENERAL",
          slug: "other",
          abbreviation: "OTH",
        },
        admin.cookie,
      ),
    );
    expect(conflict.status).toBe(409);
    const body = await conflict.json();
    expect(body.error.code).toBe("BOARD_SIBLING_CONFLICT");
    expect(body.error.field).toBe("name");
  });

  it("validates input before invoking the module", async () => {
    // parentId is required (null means root) and must be a UUID.
    const missingParent = await app.request(
      "/api/admin/boards",
      json("POST", { name: "X", slug: "x", abbreviation: "X" }, admin.cookie),
    );
    expect(missingParent.status).toBe(400);
    expect((await missingParent.json()).error.code).toBe("INVALID_INPUT");

    const badId = await app.request(
      "/api/admin/boards/not-a-uuid",
      json("PATCH", { name: "X" }, admin.cookie),
    );
    expect(badId.status).toBe(400);
  });

  it("updates (204) and moves (204) boards", async () => {
    const { boardId: alpha } = await createBoard({
      parentId: null,
      name: "Alpha",
      slug: "alpha",
      abbreviation: "ALP",
    });
    const { boardId: beta } = await createBoard({
      parentId: null,
      name: "Beta",
      slug: "beta",
      abbreviation: "BET",
    });

    const updated = await app.request(
      `/api/admin/boards/${alpha}`,
      json("PATCH", { description: "  Updated  " }, admin.cookie),
    );
    expect(updated.status).toBe(204);
    const [row] = await testSql()`
      SELECT description FROM boards WHERE id = ${alpha}
    `;
    expect(row.description).toBe("Updated");

    const moved = await app.request(
      `/api/admin/boards/${alpha}/move`,
      json("POST", { newParentId: beta, sortOrder: 2 }, admin.cookie),
    );
    expect(moved.status).toBe(204);

    // Moving a board under its own descendant is a 409 cycle.
    const cycle = await app.request(
      `/api/admin/boards/${beta}/move`,
      json("POST", { newParentId: alpha, sortOrder: 0 }, admin.cookie),
    );
    expect(cycle.status).toBe(409);
    expect((await cycle.json()).error.code).toBe("BOARD_CYCLE");
  });

  it("atomically saves complete sibling order groups", async () => {
    const { boardId: alpha } = await createBoard({
      parentId: null,
      name: "Alpha",
      slug: "alpha",
      abbreviation: "ALP",
    });
    const { boardId: beta } = await createBoard({
      parentId: null,
      name: "Beta",
      slug: "beta",
      abbreviation: "BET",
    });

    const response = await app.request(
      "/api/admin/boards/order",
      json(
        "PUT",
        { groups: [{ parentId: null, boardIds: [beta, alpha] }] },
        admin.cookie,
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ groups: 1, boards: 2 });
    const rows = await testSql()`
      SELECT id, sort_order FROM boards ORDER BY sort_order
    `;
    expect(rows).toEqual([
      { id: beta, sort_order: 0 },
      { id: alpha, sort_order: 1 },
    ]);
  });

  it("previews impact and purges only with an exact name and fresh counts", async () => {
    const { boardId: rootId } = await createBoard({
      parentId: null,
      name: "Doomed",
      slug: "doomed",
      abbreviation: "DOO",
    });
    await createBoard({
      parentId: rootId,
      name: "Child",
      slug: "child",
      abbreviation: "CHI",
    });

    const previewRes = await app.request(
      `/api/admin/boards/${rootId}/purge-impact`,
      { headers: { Cookie: admin.cookie } },
    );
    expect(previewRes.status).toBe(200);
    const preview = await previewRes.json();
    expect(preview.boardName).toBe("Doomed");
    expect(preview.counts.boards).toBe(2);

    const wrongName = await app.request(
      `/api/admin/boards/${rootId}/purge`,
      json(
        "POST",
        { confirmationName: "doomed", expectedImpact: preview.counts },
        admin.cookie,
      ),
    );
    expect(wrongName.status).toBe(400);
    expect((await wrongName.json()).error.code).toBe("PURGE_NAME_MISMATCH");

    const stale = await app.request(
      `/api/admin/boards/${rootId}/purge`,
      json(
        "POST",
        {
          confirmationName: "Doomed",
          expectedImpact: { ...preview.counts, boards: 99 },
        },
        admin.cookie,
      ),
    );
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("PURGE_IMPACT_CHANGED");

    const purged = await app.request(
      `/api/admin/boards/${rootId}/purge`,
      json(
        "POST",
        { confirmationName: "Doomed", expectedImpact: preview.counts },
        admin.cookie,
      ),
    );
    expect(purged.status).toBe(200);
    expect(await purged.json()).toEqual(preview.counts);

    const [{ count }] = await testSql()`
      SELECT count(*)::int AS count FROM boards
    `;
    expect(count).toBe(0);
  });
});
