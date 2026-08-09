import { expect, test } from "@playwright/test";
import { fillWhenReady, resetForumTest, signUp } from "./helpers";

test.beforeEach(resetForumTest);

test("sign-in translates provider errors into announced Dutch copy", async ({
  page,
}) => {
  await page.goto("/auth/sign-in");
  await fillWhenReady(page.getByLabel("E-mailadres"), "nobody@example.test");
  await fillWhenReady(page.getByLabel("Wachtwoord"), "wrong-password");
  await page.getByRole("button", { name: "Inloggen" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toHaveText("Het e-mailadres of wachtwoord klopt niet.");
  await expect(alert).not.toContainText(/invalid|password/i);
});

test("sign-up translates duplicate-account errors without provider copy", async ({
  context,
  page,
}) => {
  await signUp(page, "existing-member");
  await context.clearCookies();
  await page.goto("/auth/sign-up");
  await fillWhenReady(page.getByLabel("Naam"), "Another name");
  await fillWhenReady(
    page.getByLabel("E-mailadres"),
    "existing-member@example.test",
  );
  await fillWhenReady(page.getByLabel("Wachtwoord"), "test-password-123");
  await page.getByRole("button", { name: "Account aanmaken" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Er bestaat al een account met dit e-mailadres.",
  );
});

test("sign-in can issue a browser-session-only cookie", async ({
  context,
  page,
}) => {
  await signUp(page, "session-member");
  await context.clearCookies();
  await page.goto("/auth/sign-in");

  const rememberMe = page.getByLabel("Ingelogd blijven");
  await expect(rememberMe).toBeChecked();
  await rememberMe.uncheck();
  await fillWhenReady(
    page.getByLabel("E-mailadres"),
    "session-member@example.test",
  );
  await fillWhenReady(page.getByLabel("Wachtwoord"), "test-password-123");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL("/");

  const sessionCookie = (await context.cookies()).find((cookie) =>
    cookie.name.includes("session_token"),
  );
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.expires).toBe(-1);
});

test("auth forms stack, fit, and keep logical focus order at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/sign-in");

  const signInEmail = page.getByLabel("E-mailadres");
  const signInPassword = page.getByLabel("Wachtwoord");
  const rememberMe = page.getByLabel("Ingelogd blijven");
  await expect(signInEmail).toHaveAttribute("autocomplete", "email");
  await expect(signInPassword).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  for (const control of [
    signInEmail,
    signInPassword,
    page.getByText("Ingelogd blijven", { exact: true }).locator(".."),
  ]) {
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  await signInEmail.focus();
  await page.keyboard.press("Tab");
  await expect(signInPassword).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(rememberMe).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Inloggen" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );

  await page.goto("/auth/sign-up");
  const name = page.getByLabel("Naam");
  const email = page.getByLabel("E-mailadres");
  const password = page.getByLabel("Wachtwoord");
  await expect(name).toHaveAttribute("autocomplete", "name");
  await expect(email).toHaveAttribute("autocomplete", "email");
  await expect(password).toHaveAttribute("autocomplete", "new-password");
  for (const control of [name, email, password]) {
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  await name.focus();
  await page.keyboard.press("Tab");
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Account aanmaken" }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
