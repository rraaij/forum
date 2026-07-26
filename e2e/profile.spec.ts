/*
 * Phase 6 browser flow (plan section 8.3): profile avatar and gallery
 * editing, replacement save semantics, and server-authoritative validation.
 * Phase 7 adds activity: canonical links for root and nested topics.
 */

import { expect, test } from "@playwright/test";
import { connect, loadTestTarget } from "../packages/db/tests/helpers/test-db";
import {
  createTopicViaUi,
  fillWhenReady,
  resetForumTest,
  seedBoards,
  signUp,
} from "./helpers";

test.describe.configure({ mode: "serial" });

// 1x1 transparent PNG.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function storedProfile(name: string) {
  const sql = connect(loadTestTarget());
  try {
    const [row] = await sql`
      SELECT display_name, location, website, image, photo_urls
      FROM users WHERE name = ${name}
    `;
    return row;
  } finally {
    await sql.end();
  }
}

test.beforeEach(async () => {
  await resetForumTest();
});

test("edits profile fields with replacement semantics", async ({ page }) => {
  await signUp(page, "profile-editor");
  await page.goto("/profile");

  await fillWhenReady(page.getByLabel("Display name"), "Ramon");
  await fillWhenReady(page.getByLabel("Location"), "Netherlands");
  await fillWhenReady(page.getByLabel("Website"), "https://example.com");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  let stored = await storedProfile("profile-editor");
  expect(stored.display_name).toBe("Ramon");
  expect(stored.location).toBe("Netherlands");

  // Replacement, not patch: clearing a field and saving nulls it.
  await page.getByLabel("Location").fill("");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  stored = await storedProfile("profile-editor");
  expect(stored.location).toBeNull();
  expect(stored.display_name).toBe("Ramon"); // untouched field survives
});

test("uploads and removes an avatar, and adds a gallery photo", async ({
  page,
}) => {
  await signUp(page, "avatar-editor");
  await page.goto("/profile");

  const png = Buffer.from(TINY_PNG_BASE64, "base64");

  // Avatar saves on its own, without committing the rest of the form.
  await page.locator("#profile-avatar").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByText("Avatar updated.")).toBeVisible();
  expect((await storedProfile("avatar-editor")).image).toContain(
    "data:image/png;base64,",
  );

  // Gallery photos are staged in the browser and persisted by Save.
  await page.locator("#profile-photos").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByAltText("Gallery item 1")).toBeVisible();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  expect((await storedProfile("avatar-editor")).photo_urls).toHaveLength(1);

  await page.getByRole("button", { name: "Remove avatar" }).click();
  await expect(page.getByText("Avatar removed.")).toBeVisible();
  expect((await storedProfile("avatar-editor")).image).toBeNull();
});

test("the server rejects an invalid website and reports it", async ({
  page,
}) => {
  await signUp(page, "validation-user");
  await page.goto("/profile");

  // type=url would block submission, so set the value past the browser
  // check to prove the SERVER is the authority.
  await page.getByLabel("Website").evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "ftp://example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Website must be a valid http(s) URL",
  );
  expect((await storedProfile("validation-user")).website).toBeNull();
});

/*
 * Activity links are built from backend route params, so a topic on a root
 * board and one four levels deep must both land on their canonical URL.
 */
test("activity links navigate to root and deeply nested topics", async ({
  page,
}) => {
  const boardIds = await seedBoards([
    { name: "General", slug: "general", children: ["Deep One", "Deep Two"] },
  ]);
  await signUp(page, "activity-user");

  await page.goto("/categories/general");
  await createTopicViaUi(page, "Root level topic", "posted at the root");

  await page.goto(`/categories/general/subcategories/${boardIds["Deep Two"]}`);
  await createTopicViaUi(page, "Nested topic", "posted deep");

  await page.goto("/profile");
  const activity = page.locator("table:has(th:text-is('Kind'))");
  await expect(
    activity.getByRole("link", { name: "Nested topic" }),
  ).toBeVisible();

  // Both posts are opening posts, read from the row's own kind.
  await expect(activity.locator("tbody tr")).toHaveCount(2);
  await expect(activity.getByText("Reply")).toHaveCount(0);

  await activity.getByRole("link", { name: "Nested topic" }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `/categories/general/subcategories/${boardIds["Deep Two"]}/topics/`,
    ),
  );

  await page.goto("/profile");
  await activity.getByRole("link", { name: "Root level topic" }).click();
  // A root-board topic uses the category path, with no subcategory segment.
  await expect(page).toHaveURL(/\/categories\/general\/topics\//);
});
