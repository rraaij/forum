import { expect, test } from "@playwright/test";
import { connect, loadTestTarget } from "../packages/db/tests/helpers/test-db";
import { fillWhenReady, resetForumTest, seedBoards } from "./helpers";

test.describe.configure({ mode: "serial" });

let boardId: string;

async function seedSearchTopics(count: number): Promise<void> {
  const sql = connect(loadTestTarget());
  try {
    const [user] = await sql`
      INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
      VALUES ('search-fixture-user', 'zoeker', 'zoeker@example.test', true, now(), now())
      ON CONFLICT (id) DO UPDATE SET name = excluded.name
      RETURNING id
    `;
    for (let index = 0; index < count; index += 1) {
      const at = new Date(Date.now() - index * 60_000);
      const [topic] = await sql`
        INSERT INTO topics (
          board_id, author_id, title, slug, reply_count,
          last_activity_at, created_at
        ) VALUES (
          ${boardId}, ${user.id},
          ${index === 0 ? "Keyset route" : `Paginatie resultaat ${index}`},
          ${`search-result-${index}`}, 0, ${at}, ${at}
        ) RETURNING id
      `;
      await sql`
        INSERT INTO posts (topic_id, author_id, content, kind, created_at)
        VALUES (
          ${topic.id}, ${user.id},
          ${index === 0 ? "Hydratie gebruikt keyset paginatie zonder offset." : `Gemeenschappelijke paginatie tekst ${index}`},
          'opening', ${at}
        )
      `;
    }
  } finally {
    await sql.end();
  }
}

test.beforeEach(async () => {
  await resetForumTest();
  const ids = await seedBoards([{ name: "Technology", slug: "technology" }]);
  boardId = ids.Technology;
});

test("shell search entry submits and renders highlighted whole-row results", async ({
  page,
}) => {
  await seedSearchTopics(2);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Forumnavigatie" })
    .getByRole("link", { name: "zoeken" })
    .click();
  await expect(page).toHaveURL("/search");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Waar ben je naar op zoek?",
    }),
  ).toBeVisible();

  await fillWhenReady(page.getByLabel("Zoekterm"), "keyset paginatie");
  await page.getByRole("button", { name: "Zoeken", exact: true }).click();
  await expect(page).toHaveURL(/q=keyset(%20|\+)paginatie/);
  await expect(page.getByText("1 resultaat")).toBeVisible();
  const result = page
    .locator('[aria-label="Zoekresultaten"]')
    .getByRole("link");
  await expect(result).toHaveCount(1);
  await expect(result.locator("mark")).toContainText(["Keyset", "paginatie"]);
  await result.click();
  await expect(page).toHaveURL("/categories/technology/topics/search-result-0");
});

test("filters and sorting are URL-backed and removable", async ({ page }) => {
  await seedSearchTopics(2);
  await page.goto("/search?q=hydratie");
  await expect(page.getByText("1 resultaat")).toBeVisible();

  await page.getByRole("button", { name: "alleen topics" }).click();
  await expect(page).toHaveURL(/topicsOnly=true/);
  await expect(
    page.getByRole("heading", { name: "Niets gevonden" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /alleen topics/ }).click();
  await expect(page).not.toHaveURL(/topicsOnly/);

  await page.getByLabel("Sorteren").selectOption("relevance");
  await expect(page).toHaveURL(/sort=relevance/);
  await expect(page.getByText("1 resultaat")).toBeVisible();
});

test("cursor pagination survives reload and can return to the previous page", async ({
  page,
}) => {
  await seedSearchTopics(27);
  await page.goto("/search?q=paginatie");
  await expect(
    page.locator('[aria-label="Zoekresultaten"]').getByRole("link"),
  ).toHaveCount(25);

  await page.getByRole("button", { name: "Volgende" }).click();
  await expect(page).toHaveURL(/cursor=/);
  await expect(page).toHaveURL(/trail=first/);
  await expect(
    page.locator('[aria-label="Zoekresultaten"]').getByRole("link"),
  ).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Vorige" })).toBeEnabled();
  await page.getByRole("button", { name: "Vorige" }).click();
  await expect(page).not.toHaveURL(/cursor=/);
  await expect(
    page.locator('[aria-label="Zoekresultaten"]').getByRole("link"),
  ).toHaveCount(25);
});

test("search controls and results fit at 390px", async ({ page }) => {
  await seedSearchTopics(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search?q=paginatie");

  for (const control of [
    page.getByLabel("Zoekterm"),
    page.getByRole("button", { name: "Zoeken", exact: true }),
    page.getByRole("button", { name: "alleen topics" }),
    page.getByLabel("Sorteren"),
  ]) {
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("search rejects a whitespace-only query with native feedback", async ({
  page,
}) => {
  await page.goto("/search");
  await fillWhenReady(page.getByLabel("Zoekterm"), "  ");
  await page.getByRole("button", { name: "Zoeken", exact: true }).click();
  await expect(page).toHaveURL("/search");
  expect(
    await page
      .getByLabel("Zoekterm")
      .evaluate((element) => (element as HTMLInputElement).validationMessage),
  ).toContain("Vul minstens twee niet-lege tekens in.");
});
