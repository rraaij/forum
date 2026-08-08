import { expect, type Locator, type Page } from "@playwright/test";
import { connect, loadTestTarget } from "../packages/db/tests/helpers/test-db";

/*
 * SSR + Solid controlled inputs: a fill that lands before hydration is
 * discarded when the component re-renders from its still-empty signal
 * (the server then rejects an empty body). Retry until the value sticks,
 * which is exactly when the form has become interactive.
 */
export async function fillWhenReady(
  locator: Locator,
  value: string,
): Promise<void> {
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 250 });
  }).toPass({ timeout: 15_000 });
}

/** Wipes forum + auth content in forum_test for deterministic fixtures. */
export async function resetForumTest(): Promise<void> {
  const sql = connect(loadTestTarget());
  try {
    await sql.unsafe(
      `TRUNCATE TABLE votes, reactions, topic_views, posts, topics, boards,
       sessions, accounts, users
       RESTART IDENTITY CASCADE`,
    );
  } finally {
    await sql.end();
  }
}

/** Creates a board hierarchy directly; returns ids by name. */
export async function seedBoards(
  tree: Array<{ name: string; slug: string; children?: string[] }>,
): Promise<Record<string, string>> {
  const sql = connect(loadTestTarget());
  const ids: Record<string, string> = {};
  try {
    for (const root of tree) {
      const [row] = await sql`
        INSERT INTO boards (parent_id, name, slug, abbreviation)
        VALUES (null, ${root.name}, ${root.slug}, ${root.slug.slice(0, 5).toUpperCase()})
        RETURNING id
      `;
      ids[root.name] = row.id as string;
      let parentId = row.id as string;
      // Children are nested one level deeper than the previous entry, so a
      // list of three names produces a four-level chain from the root.
      for (const childName of root.children ?? []) {
        const childSlug = childName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const [childRow] = await sql`
          INSERT INTO boards (parent_id, name, slug, abbreviation)
          VALUES (${parentId}, ${childName}, ${childSlug}, ${childSlug.slice(0, 5).toUpperCase()})
          RETURNING id
        `;
        ids[childName] = childRow.id as string;
        parentId = childRow.id as string;
      }
    }
  } finally {
    await sql.end();
  }
  return ids;
}

export async function signUp(page: Page, name: string): Promise<void> {
  await page.goto("/auth/sign-up");
  await fillWhenReady(page.getByLabel("Naam"), name);
  await fillWhenReady(page.getByLabel("E-mailadres"), `${name}@example.test`);
  await fillWhenReady(page.getByLabel("Wachtwoord"), "test-password-123");
  await page.getByRole("button", { name: "Account aanmaken" }).click();
  await page.waitForURL("/");
}

/** Creates a topic through the UI from the currently open board page. */
export async function createTopicViaUi(
  page: Page,
  title: string,
  content: string,
): Promise<void> {
  await page.getByRole("button", { name: "Nieuw Topic" }).click();
  await fillWhenReady(
    page.getByPlaceholder("Start with a clear and specific title"),
    title,
  );
  await fillWhenReady(
    page.getByPlaceholder("Write your first post..."),
    content,
  );
  await page.getByRole("button", { name: "Create Topic" }).click();
  await page.waitForURL(/\/topics\//);
}
