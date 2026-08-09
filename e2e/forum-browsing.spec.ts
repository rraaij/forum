/*
 * Phase 4 browser flows (refactor plan section 8.3): arbitrary-depth board
 * navigation via canonical URLs, the complete topic lifecycle, locked-topic
 * handling, and view deduplication per browser session.
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

let boardIds: Record<string, string>;

test.beforeEach(async () => {
  await resetForumTest();
  boardIds = await seedBoards([
    { name: "General", slug: "general", children: ["Deep One", "Deep Two"] },
  ]);
});

test("browses an arbitrary-depth board tree using canonical URLs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /General/ })).toBeVisible();

  await page
    .getByRole("link", { name: /General/ })
    .first()
    .click();
  await expect(page).toHaveURL("/categories/general");
  await expect(
    page.getByRole("heading", { name: "General", exact: true }),
  ).toBeVisible();

  // Nested boards are addressed by UUID, not by an ancestry path.
  await page.goto(`/categories/general/subcategories/${boardIds["Deep One"]}`);
  await expect(
    page.getByRole("heading", { name: "Deep One", exact: true }),
  ).toBeVisible();

  // Third level: the breadcrumb shows the full ancestry.
  await page.goto(`/categories/general/subcategories/${boardIds["Deep Two"]}`);
  const breadcrumb = page.getByRole("navigation", { name: "Kruimelpad" });
  await expect(breadcrumb).toContainText("General");
  await expect(breadcrumb).toContainText("Deep One");
  await expect(breadcrumb).toContainText("Deep Two");
});

test("missing categories use the shared not-found state", async ({ page }) => {
  await page.goto("/categories/bestaat-niet");

  await expect(
    page.getByRole("heading", { name: "Deze forumcategorie bestaat niet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Terug naar het forum" }),
  ).toBeVisible();
});

test("index renders real activity metadata and wired actions", async ({
  page,
}) => {
  await signUp(page, "index-author");
  await page.goto(`/categories/general/subcategories/${boardIds["Deep Two"]}`);
  await createTopicViaUi(
    page,
    "Index activity",
    "Opening from the index author",
  );

  await fillWhenReady(
    page.getByPlaceholder(
      "Typ je reactie… quoten kan met de knop bij een post.",
    ),
    "One reply for the count",
  );
  await page.getByRole("button", { name: "Plaats reactie" }).click();
  await expect(page.getByText("One reply for the count")).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByText("1 categorie, 2 subforums en 1 topic om in te verdwalen."),
  ).toBeVisible();

  const categoryCard = page
    .locator('section[aria-label="Forumcategorieën"]')
    .getByRole("link")
    .first();
  await expect(categoryCard).toContainText("index-author");

  const activityRow = page
    .locator("#actieve-topics")
    .getByRole("link", { name: /Index activity/ });
  await expect(activityRow).toContainText(
    "index-author in Deep Two · 1 reactie",
  );
  await expect(activityRow).toContainText("net");
  // The index's right-hand column is the sole deliberate clock-time exception.
  await expect(activityRow.locator("time").last()).toHaveText(/^\d{2}:\d{2}$/);

  await page.getByRole("link", { name: "Nieuw topic" }).click();
  await expect(page).toHaveURL("/categories/general");
});

test("index uses the compact 390px layout", async ({ page }) => {
  await seedBoards([{ name: "Meta", slug: "meta" }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Waar wil je vandaag rondkijken?" }),
  ).toHaveCSS("font-size", "28px");
  await expect(
    page.getByRole("navigation", { name: "Subforums" }),
  ).toBeHidden();

  const categoryCards = page
    .locator('section[aria-label="Forumcategorieën"]')
    .getByRole("link");
  await expect(categoryCards).toHaveCount(2);
  const firstCard = await categoryCards.nth(0).boundingBox();
  const secondCard = await categoryCards.nth(1).boundingBox();
  expect(firstCard).not.toBeNull();
  expect(secondCard).not.toBeNull();
  expect(secondCard?.y).toBeGreaterThan(
    (firstCard?.y ?? 0) + (firstCard?.height ?? 0) - 1,
  );

  const newTopic = await page
    .getByRole("link", { name: "Nieuw topic" })
    .boundingBox();
  expect(newTopic?.width).toBeGreaterThan(340);
});

test("category listings and topic drafts work at 390px", async ({ page }) => {
  await signUp(page, "mobile-listing-user");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/categories/general");

  await expect(
    page.getByRole("navigation", { name: "Kruimelpad" }),
  ).toContainText("General");
  await expect(
    page.getByRole("heading", { name: "General", exact: true }),
  ).toHaveCSS("font-size", "32px");
  await expect(
    page.getByRole("link", { name: "Deep One", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Nog geen topics" }),
  ).toBeVisible();
  await expect(page.getByLabel("Sorteren")).toBeVisible();

  const trigger = page.getByRole("button", { name: "Nieuw topic" });
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.width).toBeGreaterThan(340);
  await trigger.click();

  const title = page.getByLabel("Titel");
  await expect(title).toBeFocused();
  await fillWhenReady(title, "Concept dat bewaard blijft");
  await page.getByRole("button", { name: "Annuleren" }).click();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(title).toHaveValue("Concept dat bewaard blijft");

  await page.goto(`/categories/general/subcategories/${boardIds["Deep Two"]}`);
  await expect(
    page.getByRole("navigation", { name: "Kruimelpad" }),
  ).toContainText(/General.*Deep One.*Deep Two/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("long board names, topic titles, and breadcrumbs do not clip at 390px", async ({
  page,
}) => {
  const longRoot = `Root${"Onbreekbaar".repeat(8)}`;
  const longChild = `Child${"Onbreekbaar".repeat(8)}`;
  const longBoards = await seedBoards([
    { name: longRoot, slug: "long-root", children: [longChild] },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: longRoot })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await page.goto(
    `/categories/long-root/subcategories/${longBoards[longChild]}`,
  );
  await expect(
    page.getByRole("navigation", { name: "Kruimelpad" }),
  ).toContainText(longChild);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await signUp(page, "long-content-user");
  await page.goto("/categories/long-root");
  const longTitle = `Topic${"Onbreekbaar".repeat(10)}`;
  await createTopicViaUi(page, longTitle, "Openingsbericht");
  await expect(page.getByRole("heading", { name: longTitle })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("creates a topic, replies, quotes, edits, and soft-deletes", async ({
  page,
}) => {
  await signUp(page, "flow-user");

  await page.goto(`/categories/general/subcategories/${boardIds["Deep Two"]}`);
  await createTopicViaUi(page, "Lifecycle topic", "The opening post");
  // Canonical nested-board topic URL.
  await expect(page).toHaveURL(
    `/categories/general/subcategories/${boardIds["Deep Two"]}/topics/lifecycle-topic`,
  );
  await expect(page.getByText("The opening post")).toBeVisible();
  await expect(page.getByText("opende dit topic net")).toBeVisible();

  // Reply.
  await fillWhenReady(
    page.getByPlaceholder(
      "Typ je reactie… quoten kan met de knop bij een post.",
    ),
    "First reply",
  );
  await page.getByRole("button", { name: "Voorbeeld", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Voorbeeld sluiten" }),
  ).toBeVisible();
  await expect(page.getByText("First reply", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Plaats reactie" }).click();
  await expect(page.getByText("First reply")).toBeVisible();

  // Quote that reply: only the ID is sent; the server snapshots it.
  const composer = page.locator("section", {
    has: page.getByPlaceholder(
      "Typ je reactie… quoten kan met de knop bij een post.",
    ),
  });
  const firstReply = page
    .locator('article[data-post-kind="reply"]', { hasText: "First reply" })
    .first();
  await firstReply
    .getByRole("button", { name: "Kopieer link naar bericht" })
    .click();
  await expect(firstReply.getByText("Link gekopieerd")).toBeVisible();
  await firstReply.getByRole("button", { name: "quoten" }).click();
  // The composer preview is the signal that the quote actually registered;
  // posting before it appears would send a reply with no quotedPostId.
  await expect(composer.locator("blockquote")).toContainText("First reply");
  await fillWhenReady(
    page.getByPlaceholder(
      "Typ je reactie… quoten kan met de knop bij een post.",
    ),
    "Quoting you",
  );
  await page.getByRole("button", { name: "Plaats reactie" }).click();

  // The composer clears its preview only after the post succeeds and route
  // invalidation is under way: a stable point to assert the rendered list.
  await expect(composer.locator("blockquote")).toHaveCount(0);

  // Scope to the persisted reply card: the composer renders its own preview
  // blockquote, so a page-wide locator would be ambiguous.
  const quotingReply = page.locator("article", { hasText: "Quoting you" });
  await expect(quotingReply.locator("blockquote")).toContainText("First reply");

  // Edit the quoted (first) reply; the immutable snapshot must NOT change.
  await firstReply.getByRole("button", { name: "bewerken" }).click();
  await page.getByLabel("Reactie bewerken").fill("First reply (edited)");
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("First reply (edited)")).toBeVisible();
  await expect(firstReply.getByText("Bewerkt net")).toBeVisible();
  await expect(quotingReply.locator("blockquote")).toContainText("First reply");
  await expect(quotingReply.locator("blockquote")).not.toContainText(
    "(edited)",
  );

  // Soft-delete it: the row remains, marked deleted.
  await firstReply.getByRole("button", { name: "verwijderen" }).click();
  await expect(page.getByText("Dit bericht is verwijderd.")).toBeVisible();
});

test("locked topics reject replies without corrupting UI state", async ({
  page,
}) => {
  await signUp(page, "lock-user");
  await page.goto("/categories/general");
  await createTopicViaUi(page, "Locked topic", "Opening");

  const reply = page.getByPlaceholder(
    "Typ je reactie… quoten kan met de knop bij een post.",
  );
  await fillWhenReady(reply, "Deze tekst moet blijven staan");

  const sql = connect(loadTestTarget());
  try {
    await sql`UPDATE topics SET is_locked = true WHERE slug = 'locked-topic'`;
  } finally {
    await sql.end();
  }

  // The page was open before the lock. The server remains authoritative and
  // the translated failure must not clear the user's draft.
  await page.getByRole("button", { name: "Plaats reactie" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Dit topic is gesloten voor nieuwe reacties.",
  );
  await expect(reply).toHaveValue("Deze tekst moet blijven staan");

  await page.reload();
  await expect(
    page.getByText("Dit topic is gesloten. Je kunt niet meer reageren."),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder(
      "Typ je reactie… quoten kan met de knop bij een post.",
    ),
  ).toHaveCount(0);
});

test("topic detail uses compact controls at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page, "mobile-topic-user");
  await page.goto("/categories/general");
  await createTopicViaUi(page, "Mobiel topic", "Mobiele openingspost");

  const openingPost = page.locator('article[data-post-kind="opening"]');
  const avatar = openingPost.locator(".avatar > div").first();
  const composer = page.getByPlaceholder(
    "Typ je reactie… quoten kan met de knop bij een post.",
  );
  const placeButton = page.getByRole("button", { name: "Plaats", exact: true });

  await expect(avatar).toHaveCSS("width", "30px");
  await expect(composer).toHaveCSS("min-height", "44px");
  await expect(placeButton).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Plaats reactie" }),
  ).toHaveCount(0);

  for (const control of [
    openingPost.getByRole("button", { name: "+ reactie" }),
    openingPost.getByRole("button", { name: "Omhoog stemmen" }),
    openingPost.getByRole("button", { name: "Omlaag stemmen" }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }

  await openingPost.getByRole("button", { name: "+ reactie" }).click();
  for (const reaction of ["👍", "❤️", "🎉"]) {
    const box = await openingPost
      .getByRole("button", { name: `Reageer met ${reaction}` })
      .boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }

  await openingPost.getByRole("button", { name: "quoten" }).click();
  const removeQuote = page.getByRole("button", { name: "Quote verwijderen" });
  const removeQuoteBox = await removeQuote.boundingBox();
  expect(removeQuoteBox?.height).toBeGreaterThanOrEqual(44);
  expect(removeQuoteBox?.width).toBeGreaterThanOrEqual(44);

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("reloading does not increase views; a new browser session does", async ({
  page,
  context,
}) => {
  await signUp(page, "view-user");
  await page.goto("/categories/general");
  await createTopicViaUi(page, "Viewed topic", "Opening");

  const viewCount = async () => {
    const sql = connect(loadTestTarget());
    try {
      const [row] = await sql`
        SELECT view_count FROM topics WHERE slug = 'viewed-topic'
      `;
      return Number(row.view_count);
    } finally {
      await sql.end();
    }
  };

  await expect.poll(viewCount).toBe(1);

  // Reload and re-navigate in the SAME browser session: still one view.
  await page.reload();
  await page.goto("/categories/general");
  await page.goto("/categories/general/topics/viewed-topic");
  await page.waitForTimeout(300);
  expect(await viewCount()).toBe(1);

  // A separate browser session (fresh sessionStorage) counts again.
  const secondPage = await context.newPage();
  await secondPage.goto("/categories/general/topics/viewed-topic");
  await expect.poll(viewCount).toBe(2);
  await secondPage.close();
});

test("load more preserves ordering and does not duplicate rows", async ({
  page,
}) => {
  await signUp(page, "paging-user");
  await page.goto("/categories/general");

  // 26 topics exceed the default page size of 25.
  const sql = connect(loadTestTarget());
  try {
    const [{ id: userId }] = await sql`SELECT id FROM users LIMIT 1`;
    for (let i = 0; i < 26; i++) {
      await sql`
        INSERT INTO topics (board_id, author_id, title, slug, reply_count,
                            last_activity_at, created_at)
        VALUES (${boardIds.General}, ${userId}, ${`Bulk topic ${i}`},
                ${`bulk-topic-${i}`}, 0, now() - (${i} * interval '1 minute'),
                now() - (${i} * interval '1 minute'))
      `;
    }
  } finally {
    await sql.end();
  }

  await page.reload();
  const rows = page.locator("[data-topic-list] [data-topic-item]");
  await expect(rows).toHaveCount(25);

  await page.getByRole("button", { name: "Meer topics laden" }).click();
  await expect(rows).toHaveCount(26);

  // No duplicated titles across the accumulated pages.
  const titles = await rows
    .locator("a")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("aria-label") ?? ""),
    );
  expect(new Set(titles).size).toBe(titles.length);
});

test("each page issues one read request; more only on Load more", async ({
  page,
}) => {
  await signUp(page, "budget-user");

  // 26 topics so the category page offers a "Load more" control.
  const sql = connect(loadTestTarget());
  try {
    const [{ id: userId }] = await sql`SELECT id FROM users LIMIT 1`;
    for (let i = 0; i < 26; i++) {
      await sql`
        INSERT INTO topics (board_id, author_id, title, slug, reply_count,
                            last_activity_at, created_at)
        VALUES (${boardIds.General}, ${userId}, ${`Budget topic ${i}`},
                ${`budget-topic-${i}`}, 0, now() - (${i} * interval '1 minute'),
                now() - (${i} * interval '1 minute'))
      `;
    }
  } finally {
    await sql.end();
  }

  /*
   * Measures CLIENT-side navigation: page.goto renders on the server, where
   * loaders run in-process and issue no browser request. Client navigation
   * is where the old one-request-per-board composition lived.
   */
  const reads: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/forum")) reads.push(req.url());
  });

  await page.goto("/");

  // Home -> category: exactly one page-oriented read.
  reads.length = 0;
  await page
    .getByRole("link", { name: /General/ })
    .first()
    .click();
  await expect(page).toHaveURL("/categories/general");
  await expect(
    page.getByRole("button", { name: "Meer topics laden" }),
  ).toBeVisible();
  expect(reads).toHaveLength(1);

  // Load more: exactly one additional read, on demand.
  reads.length = 0;
  await page.getByRole("button", { name: "Meer topics laden" }).click();
  await expect(page.locator("[data-topic-list] [data-topic-item]")).toHaveCount(
    26,
  );
  expect(reads).toHaveLength(1);

  // Category -> nested board: still a single read at any depth.
  reads.length = 0;
  await page.getByRole("link", { name: "Deep One", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Deep One", exact: true }),
  ).toBeVisible();
  expect(reads).toHaveLength(1);

  // Returning to the index uses its single page-oriented request as well.
  reads.length = 0;
  await page.getByRole("link", { name: "marijn.nl forum" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "Waar wil je vandaag rondkijken?" }),
  ).toBeVisible();
  expect(reads).toHaveLength(1);
});

test("reply Load more preserves ordering without duplicates", async ({
  page,
}) => {
  await signUp(page, "reply-paging-user");
  await page.goto("/categories/general");
  await createTopicViaUi(page, "Long thread", "Opening");

  // 26 replies exceed the default reply page size of 25.
  const sql = connect(loadTestTarget());
  try {
    const [{ id: userId }] = await sql`SELECT id FROM users LIMIT 1`;
    const [{ id: topicId }] =
      await sql`SELECT id FROM topics WHERE slug = 'long-thread'`;
    for (let i = 0; i < 26; i++) {
      await sql`
        INSERT INTO posts (topic_id, author_id, content, kind, created_at)
        VALUES (${topicId}, ${userId}, ${`Reply number ${i}`}, 'reply',
                now() + (${i} * interval '1 second'))
      `;
    }
    await sql`UPDATE topics SET reply_count = 26 WHERE id = ${topicId}`;
  } finally {
    await sql.end();
  }

  await page.reload();
  const replies = page.locator('article[data-post-kind="reply"]');
  await expect(replies).toHaveCount(25);

  await page.getByRole("button", { name: "Meer reacties laden" }).click();
  await expect(replies).toHaveCount(26);

  // Ascending order preserved across the page boundary, no repeats.
  const texts = await replies.allInnerTexts();
  const numbers = texts.map((text) =>
    Number(text.match(/Reply number (\d+)/)?.[1] ?? -1),
  );
  expect(numbers).toEqual([...Array(26).keys()]);
});
