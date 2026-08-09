/*
 * Phase 5 browser flows (plan section 8.3): an admin creates, edits, moves,
 * previews, and recursively purges a board subtree at /admin/boards, and a
 * signed-in member exercises reactions and votes on a post. Non-admins are
 * blocked from the admin route in the UI.
 */

import { expect, type Page, test } from "@playwright/test";
import { connect, loadTestTarget } from "../packages/db/tests/helpers/test-db";
import {
  createTopicViaUi,
  fillWhenReady,
  resetForumTest,
  seedBoards,
  signUp,
} from "./helpers";

test.describe.configure({ mode: "serial" });

async function promoteToAdmin(name: string): Promise<void> {
  const sql = connect(loadTestTarget());
  try {
    await sql`UPDATE users SET role = 'admin' WHERE name = ${name}`;
  } finally {
    await sql.end();
  }
}

async function deleteBoardDirectly(boardId: string): Promise<void> {
  const sql = connect(loadTestTarget());
  try {
    await sql`DELETE FROM boards WHERE id = ${boardId}`;
  } finally {
    await sql.end();
  }
}

/*
 * Create and edit forms can be on screen at the same time, so every field
 * lookup is scoped to its own form by heading text.
 */
function form(page: Page, heading: string | RegExp) {
  return page.getByRole("form", { name: heading });
}

async function fillBoardForm(
  page: Page,
  heading: string | RegExp,
  values: { name: string; slug: string; abbreviation: string },
): Promise<void> {
  const scope = form(page, heading);
  await fillWhenReady(scope.getByLabel("Naam", { exact: true }), values.name);
  await fillWhenReady(scope.getByLabel("Slug", { exact: true }), values.slug);
  await fillWhenReady(
    scope.getByLabel("Afkorting (max. 5)"),
    values.abbreviation,
  );
}

test.beforeEach(async () => {
  await resetForumTest();
});

test("non-admins see the admin no-access state", async ({ page }) => {
  /*
   * This is the first test to touch /admin/boards, so the dev server may
   * still be compiling the route on demand.
   */
  test.setTimeout(90_000);
  await signUp(page, "plain-user");
  await page.goto("/admin/boards");

  await expect(page).toHaveURL("/admin/boards");
  await expect(
    page.getByRole("heading", { name: "Dit is niet voor jou bedoeld" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Nieuw forum" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Forums beheren" })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Andere account gebruiken" }).click();
  await expect(page).toHaveURL("/auth/sign-in");
});

test("admin creates, edits, moves, previews, and purges a subtree", async ({
  page,
}) => {
  await signUp(page, "board-boss");
  await promoteToAdmin("board-boss");
  // Reload so the session carries the new admin role.
  await page.reload();

  await page.getByLabel("Accountmenu").click();
  await page.getByRole("link", { name: "Forums beheren" }).click();
  await expect(page).toHaveURL("/admin/boards");

  // Create a root category.
  await page.getByRole("button", { name: "Nieuw forum" }).click();
  await fillBoardForm(page, "Nieuw forum", {
    name: "Gaming",
    slug: "gaming",
    abbreviation: "GAM",
  });
  await form(page, "Nieuw forum")
    .getByRole("button", { name: "Forum aanmaken" })
    .click();
  await expect(page.getByText(/“Gaming” aangemaakt/)).toBeVisible();

  // Add a nested subforum under it.
  await page
    .getByRole("button", { name: /Gaming/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Subforum toevoegen" }).click();
  await fillBoardForm(page, /Nieuw subforum onder/, {
    name: "Consoles",
    slug: "consoles",
    abbreviation: "CON",
  });
  await form(page, /Nieuw subforum onder/)
    .getByRole("button", { name: "Forum aanmaken" })
    .click();
  await expect(page.getByText(/“Consoles” aangemaakt/)).toBeVisible();

  // Edit the subforum's description.
  await page
    .getByRole("button", { name: /Consoles/ })
    .first()
    .click();
  const editForm = form(page, /Bewerk “Consoles”/);
  await fillWhenReady(
    editForm.getByLabel("Omschrijving"),
    "Console gaming talk",
  );
  await editForm.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText(/“Consoles” bijgewerkt/)).toBeVisible();

  // Promote it to a root board via the dedicated move command.
  await page.getByLabel("Bovenliggend forum").selectOption("");
  await page.getByLabel("Volgorde binnen het forum").fill("30");
  await page.getByRole("button", { name: "Verplaatsen" }).click();
  await expect(page.getByText(/“Consoles” verplaatst/)).toBeVisible();

  // A move preserves the explicit domain sort key; sibling keys need not be
  // dense indexes, so deriving this value from sibling count would reorder it.
  const sql = connect(loadTestTarget());
  try {
    const [moved] = await sql<[{ sortOrder: number }]>`
      SELECT sort_order AS "sortOrder"
      FROM boards
      WHERE slug = 'consoles'
    `;
    expect(moved.sortOrder).toBe(30);
  } finally {
    await sql.end();
  }

  // Purge requires previewing the impact and retyping the exact name.
  await page
    .getByRole("button", { name: /Consoles/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Dit forum verwijderen" }).click();
  await expect(page.getByText(/Forums:/)).toBeVisible();

  const deleteButton = page.getByRole("button", {
    name: "Definitief verwijderen",
  });
  await expect(deleteButton).toBeDisabled();
  await fillWhenReady(page.getByLabel(/om te bevestigen/), "consoles");
  await expect(deleteButton).toBeDisabled(); // case-sensitive
  await fillWhenReady(page.getByLabel(/om te bevestigen/), "Consoles");
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();
  await expect(page.getByText(/1 forum.*verwijderd/)).toBeVisible();

  // Gaming survives; Consoles is gone from the tree.
  await expect(page.getByRole("button", { name: /^\d+ Gaming/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Consoles/ })).toHaveCount(0);
});

test("admin reorders siblings and sees real subtree totals at 390px", async ({
  page,
}) => {
  const ids = await seedBoards([
    {
      name: "Alpha",
      slug: "alpha",
      children: ["Een lang genoemd subforum", "Nog dieper forum"],
    },
    { name: "Beta", slug: "beta" },
  ]);
  await signUp(page, "order-admin");
  await promoteToAdmin("order-admin");
  await page.reload();

  await page.goto(`/categories/alpha/subcategories/${ids["Nog dieper forum"]}`);
  await createTopicViaUi(page, "Tellen in de boom", "Openingsbericht");
  await fillWhenReady(
    page.getByPlaceholder(
      "Typ je reactie… quoten kan met de knop bij een post.",
    ),
    "Tweede bericht",
  );
  await page.getByRole("button", { name: "Plaats reactie" }).click();
  await expect(page.getByText("Tweede bericht")).toBeVisible();

  await page.goto("/admin/boards");
  const alphaRow = page.locator(`[data-board-id="${ids.Alpha}"]`);
  await expect(alphaRow.locator("[data-board-topics]")).toHaveText(/1$/);
  await expect(alphaRow.locator("[data-board-posts]")).toHaveText(/2$/);

  const saveOrder = page.getByRole("button", { name: "Volgorde opslaan" });
  await expect(saveOrder).toBeDisabled();
  await page.getByRole("button", { name: "Verplaats Beta omhoog" }).click();
  await expect(
    page.getByRole("button", { name: "Verplaats Beta omhoog" }),
  ).toBeDisabled();
  await expect(saveOrder).toBeEnabled();
  await saveOrder.click();
  await expect(page.getByText(/2 forum.*volgorde opgeslagen/)).toBeVisible();

  await page.reload();
  const rootRows = page.locator('[data-board-depth="0"]');
  await expect(rootRows).toHaveCount(2);
  await expect(rootRows.nth(0)).toContainText("Beta");
  await expect(rootRows.nth(1)).toContainText("Alpha");

  await page.setViewportSize({ width: 390, height: 844 });
  const deepRow = page.locator(`[data-board-id="${ids["Nog dieper forum"]}"]`);
  await expect(
    deepRow.getByText("Nog dieper forum", { exact: true }),
  ).toBeVisible();
  for (const control of [
    deepRow.getByRole("button", { name: "Verplaats Nog dieper forum omhoog" }),
    deepRow.getByRole("button", { name: "Bewerk Nog dieper forum" }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("board policies hide guests and reserve topic creation for staff", async ({
  context,
  page,
}) => {
  await signUp(page, "policy-admin");
  await promoteToAdmin("policy-admin");
  await page.reload();
  await page.goto("/admin/boards");

  await page.getByRole("button", { name: "Nieuw forum" }).click();
  await fillBoardForm(page, "Nieuw forum", {
    name: "Members",
    slug: "members",
    abbreviation: "MEM",
  });
  const createForm = form(page, "Nieuw forum");
  await createForm.getByLabel("Zichtbaar voor gasten").uncheck();
  await createForm.getByLabel("Nieuwe topics toegestaan").uncheck();
  await createForm.getByRole("button", { name: "Forum aanmaken" }).click();
  await expect(page.getByText(/“Members” aangemaakt/)).toBeVisible();

  // Staff can still start discussions when regular topic creation is closed.
  await page.goto("/categories/members");
  await expect(page.getByRole("button", { name: "Nieuw topic" })).toBeVisible();

  await context.clearCookies();
  await page.goto("/categories/members");
  await expect(
    page.getByRole("heading", {
      name: "Deze forumcategorie bestaat niet",
    }),
  ).toBeVisible();

  await signUp(page, "policy-member");
  await page.goto("/categories/members");
  await expect(
    page.getByText("Nieuwe topics zijn in dit forum gesloten."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Nieuw topic" })).toHaveCount(
    0,
  );

  // A hard navigation exercises SSR, where the incoming session cookie must
  // be forwarded to the API before the browser hydrates.
  await page.reload();
  await expect(
    page.getByText("Nieuwe topics zijn in dit forum gesloten."),
  ).toBeVisible();
});

test("a stale purge preview is cleared and must be reviewed again", async ({
  page,
}) => {
  const ids = await seedBoards([{ name: "Stale", slug: "stale" }]);
  await signUp(page, "stale-admin");
  await promoteToAdmin("stale-admin");
  await page.reload();
  await page.goto("/admin/boards");

  await page.getByRole("button", { name: /Stale/ }).first().click();
  await page.getByRole("button", { name: "Dit forum verwijderen" }).click();
  await expect(page.getByText(/Forums:/)).toBeVisible();

  // Change the server-owned impact after preview without refreshing the UI.
  const status = await page.evaluate(async (boardId) => {
    const response = await fetch("/api/topics", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        title: "Late topic",
        content: "invalidates the preview",
      }),
    });
    return response.status;
  }, ids.Stale);
  expect(status).toBe(201);

  await fillWhenReady(page.getByLabel(/om te bevestigen/), "Stale");
  await page.getByRole("button", { name: "Definitief verwijderen" }).click();
  await expect(
    page.getByText(/contents changed since the purge preview/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Definitief verwijderen" }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/om te bevestigen/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Dit forum verwijderen" }),
  ).toBeVisible();
});

test("a failed impact refresh clears the previous preview", async ({
  page,
}) => {
  const ids = await seedBoards([{ name: "Vanishing", slug: "vanishing" }]);
  await signUp(page, "refresh-admin");
  await promoteToAdmin("refresh-admin");
  await page.reload();
  await page.goto("/admin/boards");

  await page
    .getByRole("button", { name: /Vanishing/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Dit forum verwijderen" }).click();
  await expect(page.getByText(/Forums:/)).toBeVisible();
  await deleteBoardDirectly(ids.Vanishing);

  await page.getByRole("button", { name: "Dit forum verwijderen" }).click();
  await expect(page.getByText("Board not found")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Definitief verwijderen" }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/om te bevestigen/)).toHaveCount(0);
});

test("a cycle-producing move is rejected with a clear message", async ({
  page,
}) => {
  const ids = await seedBoards([
    { name: "Root", slug: "root", children: ["Middle", "Leaf"] },
  ]);
  await signUp(page, "tree-admin");
  await promoteToAdmin("tree-admin");
  // Reload first: the cached session still carries the pre-promotion role,
  // and the route guard would bounce us back to the home page.
  await page.reload();
  await page.goto("/admin/boards");
  await expect(page).toHaveURL("/admin/boards");

  // Try to move Root under its own grandchild.
  await page.getByRole("button", { name: /Root/ }).first().click();
  await page.getByLabel("Bovenliggend forum").selectOption(ids.Leaf);
  await page.getByRole("button", { name: "Verplaatsen" }).click();
  // The server's typed BOARD_CYCLE error reaches the operator verbatim.
  await expect(page.getByRole("alert")).toContainText(
    /cannot become its own ancestor/i,
  );
});

test("a signed-in user can react, unreact, upvote, switch, and unvote", async ({
  page,
}) => {
  await seedBoards([{ name: "General", slug: "general" }]);
  await signUp(page, "reactor");
  await page.goto("/categories/general");
  await createTopicViaUi(page, "Reactions topic", "Opening post");

  await fillWhenReady(
    page.getByPlaceholder(
      "Typ je reactie… quoten kan met de knop bij een post.",
    ),
    "React to me",
  );
  await page.getByRole("button", { name: "Plaats reactie" }).click();
  await expect(page.getByText("React to me")).toBeVisible();

  const article = page.locator("article", { hasText: "React to me" });
  const upvote = article.getByRole("button", { name: "Omhoog stemmen" });
  const downvote = article.getByRole("button", { name: "Omlaag stemmen" });
  const score = article.getByLabel("Stemscore");

  // React, then remove the reaction (toggle semantics).
  await article.getByRole("button", { name: "+ reactie" }).click();
  await article.getByRole("button", { name: "Reageer met 👍" }).click();
  const thumbsUp = article.getByRole("button", { name: "Reageer met 👍" });
  await expect(thumbsUp).toContainText("1");
  await thumbsUp.click();
  await expect(thumbsUp).toHaveCount(0);

  // Upvote, switch to downvote, then remove the vote.
  await upvote.click();
  await expect(score).toHaveText("1");
  await downvote.click();
  await expect(score).toHaveText("-1");
  await downvote.click();
  await expect(score).toHaveText("0");
});
