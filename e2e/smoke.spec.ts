/*
 * Phase 0 browser smoke test: the forum starts against forum_test and the
 * authentication fixture (sign-up through the real UI) works. Servers are
 * started by Playwright via the fail-closed dev:test wrappers
 * (playwright.config.ts webServer).
 */

import { expect, test } from "@playwright/test";
import { fillWhenReady, resetForumTest, signUp } from "./helpers";

// Every browser test starts from deterministic fixtures. The reset helper is
// the single schema-aware list, so per-test isolation does not duplicate it.
test.beforeEach(resetForumTest);

test("forum renders for a signed-out visitor", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "marijn.nl forum" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "inloggen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Aanmelden" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Apps" }).locator(":scope > *"),
  ).toHaveText(["forum", "nieuws", "fotoboek", "dm"]);
  await expect(
    page
      .getByRole("navigation", { name: "Forumnavigatie" })
      .getByRole("link", { name: "zoeken" }),
  ).toBeVisible();
});

test("narrow shell exposes the app navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, "mobile-shell-user");

  const brand = page.getByRole("link", { name: "marijn.nl forum" });
  const account = page.getByLabel("Accountmenu");
  for (const control of [brand, account, page.getByLabel("Appmenu")]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByRole("navigation", { name: "Apps" })).toBeHidden();

  await page.getByLabel("Appmenu").click();
  await expect(
    page.getByRole("navigation", { name: "Apps op mobiel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Apps op mobiel" }).getByText("forum"),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Apps op mobiel" })
    .getByRole("link", { name: "forum" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Apps op mobiel" }),
  ).toBeHidden();
});

test("sign-up through the UI creates a working session", async ({ page }) => {
  await page.goto("/auth/sign-up");
  await fillWhenReady(page.getByLabel("Naam"), "e2e-user");
  await fillWhenReady(page.getByLabel("E-mailadres"), "e2e-user@example.test");
  await fillWhenReady(page.getByLabel("Wachtwoord"), "test-password-123");
  await page.getByRole("button", { name: "Account aanmaken" }).click();

  // Successful sign-up navigates home and the header shows the user.
  await page.waitForURL("/");
  await expect(page.getByText("e2e-user").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "inloggen" })).toHaveCount(0);
});
