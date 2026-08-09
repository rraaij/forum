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

test("signed-out visitors see the profile access state", async ({ page }) => {
  await page.goto("/profile");

  await expect(
    page.getByRole("heading", { name: "Log in om je profiel te bekijken" }),
  ).toBeVisible();
  await expect(page.getByLabel("Weergavenaam")).toHaveCount(0);

  await page.getByRole("link", { name: "Inloggen", exact: true }).click();
  await expect(page).toHaveURL("/auth/sign-in");
});

test("edits profile fields with replacement semantics", async ({ page }) => {
  await signUp(page, "profile-editor");
  await page.goto("/profile");

  await fillWhenReady(page.getByLabel("Weergavenaam"), "Ramon");
  await fillWhenReady(page.getByLabel("Woonplaats"), "Netherlands");
  await fillWhenReady(page.getByLabel("Website"), "https://example.com");
  await page.getByRole("button", { name: "Profiel opslaan" }).click();
  await expect(page.getByText("Profiel opgeslagen.")).toBeVisible();

  let stored = await storedProfile("profile-editor");
  expect(stored.display_name).toBe("Ramon");
  expect(stored.location).toBe("Netherlands");

  // Replacement, not patch: clearing a field and saving nulls it.
  await page.getByLabel("Woonplaats").fill("");
  await page.getByRole("button", { name: "Profiel opslaan" }).click();
  await expect(page.getByText("Profiel opgeslagen.")).toBeVisible();

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
  await expect(page.getByText("Avatar bijgewerkt.")).toBeVisible();
  expect((await storedProfile("avatar-editor")).image).toContain(
    "data:image/png;base64,",
  );

  // Gallery photos are staged in the browser and persisted by Save.
  await page.locator("#profile-photos").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByAltText("Foto 1")).toBeVisible();
  await page.getByRole("button", { name: "Profiel opslaan" }).click();
  await expect(page.getByText("Profiel opgeslagen.")).toBeVisible();
  expect((await storedProfile("avatar-editor")).photo_urls).toHaveLength(1);

  await page.getByRole("button", { name: "Foto 1 verwijderen" }).click();
  await expect(page.getByAltText("Foto 1")).toHaveCount(0);
  await page.getByRole("button", { name: "Profiel opslaan" }).click();
  await expect(page.getByText("Profiel opgeslagen.")).toBeVisible();
  expect((await storedProfile("avatar-editor")).photo_urls).toHaveLength(0);

  await page.getByRole("button", { name: "Verwijderen", exact: true }).click();
  await expect(page.getByText("Avatar verwijderd.")).toBeVisible();
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
  await page.getByRole("button", { name: "Profiel opslaan" }).click();

  await expect(page.locator("#profile-website-error")).toContainText(
    "Website moet een geldig adres zijn dat begint met http:// of https://.",
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
  const activity = page.getByRole("region", { name: "Wat je laatst deed" });
  await expect(
    activity.getByRole("link", { name: "Nested topic" }),
  ).toBeVisible();

  // Both posts are opening posts, read from the row's own kind.
  await expect(activity.locator("[data-activity-item]")).toHaveCount(2);
  await expect(activity.getByText("reactie")).toHaveCount(0);

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

test("password modal validates and clears credentials on cancellation", async ({
  page,
}) => {
  await signUp(page, "password-cancel-user");
  await page.goto("/profile");

  const trigger = page.getByRole("button", { name: "Wachtwoord wijzigen" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Wachtwoord wijzigen" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Huidig wachtwoord").fill("test-password-123");
  await dialog.locator("#new-password").fill("kort");
  await dialog.locator("#confirm-password").fill("kort");
  await dialog.getByRole("button", { name: "Wijzigen", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("minimaal 8 tekens");

  await dialog.locator("#new-password").fill("nieuw-password-456");
  await dialog.locator("#confirm-password").fill("anders-password-456");
  await dialog.getByRole("button", { name: "Wijzigen", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "De nieuwe wachtwoorden zijn niet hetzelfde.",
  );

  await dialog.getByRole("button", { name: "Annuleren" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog.getByLabel("Huidig wachtwoord")).toHaveValue("");
  await expect(dialog.locator("#new-password")).toHaveValue("");
  await expect(dialog.locator("#confirm-password")).toHaveValue("");

  await dialog.getByLabel("Huidig wachtwoord").fill("tijdelijk");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog.getByLabel("Huidig wachtwoord")).toHaveValue("");
  await dialog.getByLabel("Huidig wachtwoord").fill("nog tijdelijk");
  await dialog.click({ position: { x: 2, y: 2 } });
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("changes the password and keeps the current session active", async ({
  page,
}) => {
  await signUp(page, "password-success-user");
  await page.goto("/profile");
  await page.getByRole("button", { name: "Wachtwoord wijzigen" }).click();
  const dialog = page.getByRole("dialog", { name: "Wachtwoord wijzigen" });

  await dialog.getByLabel("Huidig wachtwoord").fill("verkeerd");
  await dialog.locator("#new-password").fill("new-password-456");
  await dialog.locator("#confirm-password").fill("new-password-456");
  await dialog.getByRole("button", { name: "Wijzigen", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Je huidige wachtwoord klopt niet.",
  );

  await dialog.getByLabel("Huidig wachtwoord").fill("test-password-123");
  await dialog.getByRole("button", { name: "Wijzigen", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Je wachtwoord is gewijzigd.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Je profiel" })).toBeVisible();

  await page.getByLabel("Accountmenu").click();
  await page.getByRole("button", { name: "Uitloggen" }).click();
  await expect(page.getByRole("link", { name: "Aanmelden" })).toBeVisible();
  await page.goto("/auth/sign-in");
  await expect(async () => {
    await page
      .getByLabel("E-mailadres")
      .fill("password-success-user@example.test");
    await page.getByLabel("Wachtwoord").fill("new-password-456");
    await page.getByRole("button", { name: "Inloggen" }).click();
    await expect(page).toHaveURL("/", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
});

test("profile and password modal fit at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, "mobile-profile-user");
  await page.goto("/profile");

  await page.locator("#profile-photos").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  const removePhoto = page.getByRole("button", { name: "Foto 1 verwijderen" });
  const removePhotoBox = await removePhoto.boundingBox();
  expect(removePhotoBox?.height).toBeGreaterThanOrEqual(44);
  expect(removePhotoBox?.width).toBeGreaterThanOrEqual(44);

  for (const control of [
    page.getByRole("button", { name: "Wachtwoord wijzigen" }),
    page.getByRole("button", { name: "Profiel opslaan" }),
    page.getByLabel("Avatar kiezen", { exact: true }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await fillWhenReady(page.getByLabel("Weergavenaam"), "Mobiel profiel");
  await page.getByRole("button", { name: "Profiel opslaan" }).click();
  await expect(page.getByText("Profiel opgeslagen.")).toBeVisible();

  await page.getByRole("button", { name: "Wachtwoord wijzigen" }).click();
  const dialog = page.getByRole("dialog", { name: "Wachtwoord wijzigen" });
  const dialogBox = await dialog.locator(".modal-box").boundingBox();
  expect(dialogBox?.width).toBeLessThanOrEqual(358);
  for (const button of [
    dialog.getByRole("button", { name: "Wijzigen", exact: true }),
    dialog.getByRole("button", { name: "Annuleren" }),
  ]) {
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
