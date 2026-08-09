import { expect, test } from "@playwright/test";
import {
  createTopicViaUi,
  fillWhenReady,
  resetForumTest,
  seedBoards,
  signUp,
} from "./helpers";

test("topic subscriptions deliver exact-reply notifications", async ({
  browser,
  page,
}) => {
  await resetForumTest();
  await seedBoards([{ name: "General", slug: "general" }]);

  await signUp(page, "notification-creator");
  await page.goto("/categories/general");
  await createTopicViaUi(page, "Meldingen topic", "Openingspost");
  const topicUrl = page.url();
  await expect(page.getByRole("button", { name: "Geabonneerd" })).toBeVisible();

  const replierContext = await browser.newContext();
  const replierPage = await replierContext.newPage();
  try {
    await signUp(replierPage, "notification-replier");
    await replierPage.goto(topicUrl);
    await expect(
      replierPage.getByRole("button", { name: "Abonneer" }),
    ).toBeVisible();
    await fillWhenReady(
      replierPage.getByPlaceholder(
        "Typ je reactie… quoten kan met de knop bij een post.",
      ),
      "Dit is de gemelde reactie",
    );
    await replierPage.getByRole("button", { name: "Plaats reactie" }).click();
    await expect(
      replierPage.getByText("Dit is de gemelde reactie"),
    ).toBeVisible();

    await page.reload();
    const unread = page.getByRole("link", { name: "1 ongelezen meldingen" });
    await expect(unread).toBeVisible();
    await unread.click();
    await expect(page).toHaveURL("/notifications");

    const notification = page.getByRole("link", {
      name: /notification-replier.*Meldingen topic/i,
    });
    await expect(notification).toBeVisible();
    await notification.click();
    await expect(page).toHaveURL(/\?post=[0-9a-f-]+#post-[0-9a-f-]+$/);
    const targetPost = page.locator('article[data-post-kind="reply"]', {
      hasText: "Dit is de gemelde reactie",
    });
    await expect(targetPost).toBeVisible();
    await expect(targetPost).toBeInViewport();
    await expect(
      page.getByRole("link", { name: /ongelezen meldingen/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Geabonneerd" }).click();
    await expect(page.getByRole("button", { name: "Abonneer" })).toBeVisible();
    await expect(
      page.getByText("Je ontvangt geen nieuwe meldingen voor dit topic."),
    ).toBeVisible();

    await fillWhenReady(
      replierPage.getByPlaceholder(
        "Typ je reactie… quoten kan met de knop bij een post.",
      ),
      "Na het opzeggen",
    );
    await replierPage.getByRole("button", { name: "Plaats reactie" }).click();
    await expect(replierPage.getByText("Na het opzeggen")).toBeVisible();

    await page.reload();
    await expect(page.getByText("hoi, notification-creator")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /ongelezen meldingen/ }),
    ).toHaveCount(0);
  } finally {
    await replierContext.close();
  }
});
