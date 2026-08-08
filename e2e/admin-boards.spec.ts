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

test("non-admins are redirected away from /admin/boards", async ({ page }) => {
  /*
   * This is the first test to touch /admin/boards, so the dev server may
   * still be compiling the route on demand. Allow for that: measured warm,
   * the redirect lands in well under half a second.
   */
  test.setTimeout(90_000);
  await signUp(page, "plain-user");
  await page.goto("/admin/boards");
  /*
   * The guard decides once the browser session request resolves. The API
   * guard is the security seam and is tested separately.
   */
  await expect(page).toHaveURL("/", { timeout: 60_000 });
  await expect(page.getByRole("link", { name: "⚙️ Manage" })).toHaveCount(0);
});

test("admin creates, edits, moves, previews, and purges a subtree", async ({
  page,
}) => {
  await signUp(page, "board-boss");
  await promoteToAdmin("board-boss");
  // Reload so the session carries the new admin role.
  await page.reload();

  await page.getByRole("link", { name: "⚙️ Manage" }).click();
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
  await page.getByRole("button", { name: "Verplaatsen" }).click();
  await expect(page.getByText(/“Consoles” verplaatst/)).toBeVisible();

  // Purge requires previewing the impact and retyping the exact name.
  await page
    .getByRole("button", { name: /Consoles/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Dit forum verwijderen →" }).click();
  await expect(page.getByText(/Forums:/)).toBeVisible();

  const deleteButton = page.getByRole("button", {
    name: "Definitief verwijderen",
  });
  await expect(deleteButton).toBeDisabled();
  await fillWhenReady(page.getByLabel("Bevestig forumnaam"), "consoles");
  await expect(deleteButton).toBeDisabled(); // case-sensitive
  await fillWhenReady(page.getByLabel("Bevestig forumnaam"), "Consoles");
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();
  await expect(page.getByText(/1 forum.*verwijderd/)).toBeVisible();

  // Gaming survives; Consoles is gone from the tree.
  await expect(page.getByRole("button", { name: /Gaming/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Consoles/ })).toHaveCount(0);
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
  await page.getByRole("button", { name: "Dit forum verwijderen →" }).click();
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

  await fillWhenReady(page.getByLabel("Bevestig forumnaam"), "Stale");
  await page.getByRole("button", { name: "Definitief verwijderen" }).click();
  await expect(
    page.getByText(/contents changed since the purge preview/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Definitief verwijderen" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Bevestig forumnaam")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Dit forum verwijderen →" }),
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
  await page.getByRole("button", { name: "Dit forum verwijderen →" }).click();
  await expect(page.getByText(/Forums:/)).toBeVisible();
  await deleteBoardDirectly(ids.Vanishing);

  await page.getByRole("button", { name: "Dit forum verwijderen →" }).click();
  await expect(page.getByText("Board not found")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Definitief verwijderen" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Bevestig forumnaam")).toHaveCount(0);
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
  const thumbsUp = article.getByRole("button", { name: "Reageer met 👍" });
  const upvote = article.getByRole("button", { name: "Omhoog stemmen" });
  const downvote = article.getByRole("button", { name: "Omlaag stemmen" });
  const score = article.getByLabel("Stemscore");

  // React, then remove the reaction (toggle semantics).
  await thumbsUp.click();
  await expect(thumbsUp).toContainText("1");
  await thumbsUp.click();
  await expect(thumbsUp).not.toContainText("1");

  // Upvote, switch to downvote, then remove the vote.
  await upvote.click();
  await expect(score).toHaveText("1");
  await downvote.click();
  await expect(score).toHaveText("-1");
  await downvote.click();
  await expect(score).toHaveText("0");
});
