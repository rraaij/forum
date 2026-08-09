import { expect, type Locator, type Page, test } from "@playwright/test";
import { connect, loadTestTarget } from "../packages/db/tests/helpers/test-db";
import { resetForumTest, seedBoards, signUp } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(resetForumTest);

async function expectKeyboardFocus(
  page: Page,
  locator: Locator,
): Promise<void> {
  await locator.focus();
  // Programmatic focus alone does not consistently activate :focus-visible.
  // Moving away and back with Tab verifies the keyboard-visible treatment users
  // actually receive, rather than only the DOM's focused element.
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(locator).toBeFocused();

  const focusStyle = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      offset: style.outlineOffset,
      style: style.outlineStyle,
      width: style.outlineWidth,
    };
  });
  expect(focusStyle.style).not.toBe("none");
  expect(focusStyle.width).not.toBe("0px");
  expect(focusStyle.offset).toBe("2px");
}

test("public, auth, search, and not-found routes retain ordered visible focus", async ({
  page,
}) => {
  await seedBoards([{ name: "General", slug: "general" }]);
  await page.goto("/");
  await expectKeyboardFocus(page, page.getByRole("link", { name: /General/ }));

  await page.goto("/search");
  const query = page.getByLabel("Zoekterm");
  await expectKeyboardFocus(page, query);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Zoeken" })).toBeFocused();

  await page.goto("/auth/sign-in");
  const email = page.getByLabel("E-mailadres");
  await expectKeyboardFocus(page, email);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Wachtwoord")).toBeFocused();

  await page.goto("/auth/sign-up");
  const name = page.getByLabel("Naam");
  await expectKeyboardFocus(page, name);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("E-mailadres")).toBeFocused();

  await page.goto("/categories/bestaat-niet");
  await expectKeyboardFocus(
    page,
    page.getByRole("link", { name: "Terug naar het forum" }),
  );
});

test("signed-in forum, profile, and notification routes retain visible focus", async ({
  page,
}) => {
  const boards = await seedBoards([{ name: "General", slug: "general" }]);
  await signUp(page, "keyboard-member");

  const sql = connect(loadTestTarget());
  try {
    const [user] =
      await sql`SELECT id FROM users WHERE name = 'keyboard-member'`;
    const [topic] = await sql`
      INSERT INTO topics (board_id, author_id, title, slug, reply_count, last_activity_at)
      VALUES (${boards.General}, ${user.id}, 'Keyboard topic', 'keyboard-topic', 0, now())
      RETURNING id
    `;
    await sql`
      INSERT INTO posts (topic_id, author_id, content, kind)
      VALUES (${topic.id}, ${user.id}, 'Keyboard content', 'opening')
    `;
  } finally {
    await sql.end();
  }

  await page.goto("/categories/general");
  await expectKeyboardFocus(
    page,
    page.getByRole("button", { name: "Nieuw topic" }),
  );

  await page.goto("/categories/general/topics/keyboard-topic");
  await expectKeyboardFocus(
    page,
    page.getByRole("button", { name: "Plaats reactie" }),
  );

  await page.goto("/profile");
  await expectKeyboardFocus(
    page,
    page.getByRole("button", { name: "Wachtwoord wijzigen" }),
  );
  await page
    .getByRole("button", { name: "Wachtwoord wijzigen" })
    .press("Enter");
  const dialog = page.getByRole("dialog", { name: "Wachtwoord wijzigen" });
  await expect(dialog.getByLabel("Huidig wachtwoord")).toBeFocused();
  await expectKeyboardFocus(page, dialog.locator("#new-password"));

  await page.keyboard.press("Escape");
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: "Meldingen" })).toBeVisible();
  await expectKeyboardFocus(page, page.getByLabel("Accountmenu"));
});

test("admin and no-access states retain visible focus", async ({ page }) => {
  await signUp(page, "plain-member");
  await page.goto("/admin/boards");
  await expectKeyboardFocus(
    page,
    page.getByRole("link", { name: "Terug naar het forum" }),
  );

  const sql = connect(loadTestTarget());
  try {
    await sql`UPDATE users SET role = 'admin' WHERE name = 'plain-member'`;
  } finally {
    await sql.end();
  }
  await page.reload();
  await page.goto("/admin/boards");
  await expectKeyboardFocus(
    page,
    page.getByRole("button", { name: "Nieuw forum" }),
  );
});
