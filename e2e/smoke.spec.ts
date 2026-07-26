/*
 * Phase 0 browser smoke test: the forum starts against forum_test and the
 * authentication fixture (sign-up through the real UI) works. Servers are
 * started by Playwright via the fail-closed dev:test wrappers
 * (playwright.config.ts webServer).
 */

import { expect, test } from "@playwright/test";
import { fillWhenReady, resetForumTest } from "./helpers";

// Every browser test starts from deterministic fixtures. The reset helper is
// the single schema-aware list, so per-test isolation does not duplicate it.
test.beforeEach(resetForumTest);

test("forum renders for a signed-out visitor", async ({ page }) => {
  await page.goto("/");
  // Signed-out header shows the guest label.
  await expect(page.getByText("gast").first()).toBeVisible();
});

test("sign-up through the UI creates a working session", async ({ page }) => {
  await page.goto("/auth/sign-up");
  await fillWhenReady(page.getByPlaceholder("Name"), "e2e-user");
  await fillWhenReady(page.getByPlaceholder("Email"), "e2e-user@example.test");
  await fillWhenReady(page.getByPlaceholder("Password"), "test-password-123");
  await page.getByRole("button", { name: "Sign Up" }).click();

  // Successful sign-up navigates home and the header shows the user.
  await page.waitForURL("/");
  await expect(page.getByText("e2e-user").first()).toBeVisible();
  await expect(page.getByText("gast")).toHaveCount(0);
});
