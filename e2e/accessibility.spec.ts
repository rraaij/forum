import { expect, type Locator, test } from "@playwright/test";
import { resetForumTest } from "./helpers";

test.beforeEach(resetForumTest);

async function contrastRatio(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const parse = (value: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) return [0, 0, 0];
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luminance = (rgb: number[]) => {
      const [red, green, blue] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const style = getComputedStyle(element);
    const foreground = luminance(parse(style.color));
    const background = luminance(parse(style.backgroundColor));
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
}

test("skip link is first and route-level states use a primary heading", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Naar hoofdinhoud" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.goto("/profile");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Log in om je profiel te bekijken",
    }),
  ).toBeVisible();
});

test("semantic small-text color pairs meet WCAG AA contrast", async ({
  page,
}) => {
  await page.goto("/search?q=onvindbaar");
  const primary = page.getByRole("button", { name: "Zoeken", exact: true });
  const primaryRatio = await contrastRatio(primary);
  await page.getByRole("button", { name: "alleen topics" }).click();
  await expect(page).toHaveURL(/topicsOnly=true/);
  await expect(page.getByText("0 resultaten")).toBeVisible();
  const secondary = page.getByRole("button", { name: /alleen topics/ });
  // The active filter changes semantic variants with a permitted color
  // transition. Measure its settled colors, not an interpolated frame.
  await expect
    .poll(() => contrastRatio(secondary), { message: "secondary" })
    .toBeGreaterThanOrEqual(4.5);

  await page.goto("/auth/sign-in");
  const accent = page.locator(".avatar > div > div").first();
  expect(primaryRatio, "primary").toBeGreaterThanOrEqual(4.5);
  expect(await contrastRatio(accent), "accent").toBeGreaterThanOrEqual(4.5);
});

test("fonts load and the search surface reflows at 200 percent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/search?q=onvindbaar");
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.body.style.zoom = "2";
  });

  const families = await page.evaluate(() => {
    const heading = document.querySelector("h1");
    return {
      body: getComputedStyle(document.body).fontFamily,
      heading: heading ? getComputedStyle(heading).fontFamily : "",
    };
  });
  expect(families.body).toContain("Archivo");
  expect(families.heading).toContain("Newsreader");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expect(page.getByLabel("Zoekterm")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoeken" })).toBeVisible();
});

test("native controls keep the motionless Modernist treatment", async ({
  page,
}) => {
  await page.goto("/search?q=onvindbaar");
  const styles = await page.evaluate(() => {
    const button = document.querySelector("button.btn");
    const select = document.querySelector("select.select");
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "toggle";
    document.body.append(toggle);

    const result = {
      buttonTranslate: button ? getComputedStyle(button).translate : "missing",
      buttonTransition: button
        ? getComputedStyle(button).transitionProperty
        : "missing",
      selectBackground: select
        ? getComputedStyle(select).backgroundImage
        : "missing",
      toggleDuration: getComputedStyle(toggle).transitionDuration,
    };
    toggle.remove();
    return result;
  });

  expect(styles.buttonTranslate).toBe("none");
  expect(styles.buttonTransition).not.toContain("transform");
  expect(styles.selectBackground).toBe("none");
  expect(styles.toggleDuration).toBe("0s");
});
