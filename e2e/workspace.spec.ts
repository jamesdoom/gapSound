import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("intelligence search, filter, bookmarks and read state survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Command Center", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Retry eligible:.*2 consecutive failures/),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Threat Intelligence" })
    .click();
  await expect(
    page.getByRole("link", { name: "Demonstration: phishing investigation" }),
  ).toBeVisible();
  const article = page
    .locator("article")
    .filter({ hasText: "Demonstration: phishing investigation" });
  await article
    .getByRole("button", { name: "Bookmark article", exact: true })
    .click();
  await article.getByRole("button", { name: "Mark read", exact: true }).click();
  await page.reload();
  await expect(
    article.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Threat Intelligence" })
    .click();
  await page.getByLabel("Filter category").selectOption("Malware");
  await expect(
    page.getByRole("heading", { name: "No intelligence in this view yet" }),
  ).toBeVisible();
  await page.getByLabel("Filter category").selectOption("Phishing");
  await expect(
    page.getByRole("link", { name: "Demonstration: phishing investigation" }),
  ).toBeVisible();
  await page.getByLabel("Search workspace").fill("not-present");
  await expect(
    page.getByRole("heading", { name: "No intelligence in this view yet" }),
  ).toBeVisible();
});
test("CVE research and daily training persist to the database", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "CVE Watchtower" })
    .click();
  await page.getByLabel("Search workspace").fill("CVE-2099-99999");
  await expect(
    page.getByRole("heading", { name: "Demonstration vulnerability" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Daily Training" })
    .click();
  await page.getByLabel("New study objective").fill("Review origin validation");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  // Server-confirmed checkbox state arrives after the asynchronous mutation.
  await page.getByLabel("Review origin validation").click();
  await expect(page.getByLabel("Review origin validation")).toBeChecked();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop session", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Stop session", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop session", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start session", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Review origin validation")).toBeChecked();
});
test("notes treat malicious markup as text and remain after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Research Notebook" })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Origin research");
  await page.getByLabel("Tags", { exact: true }).fill("csrf, browser");
  const payload = '<img src=x onerror="window.__xss=true"> **Evidence**';
  await page.getByLabel("Research note", { exact: true }).fill(payload);
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.getByText(payload, { exact: true })).toBeVisible();
  await expect(page.locator("main img")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Research Notebook" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Origin research", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
});
test("settings persist and mobile navigation fits the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings" })
    .click();
  await page.getByLabel("Weekly study goal (hours)").fill("12");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings" })
    .click();
  await expect(page.getByLabel("Weekly study goal (hours)")).toHaveValue("12");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("API rejects cross-origin and rebinding requests", async ({ request }) => {
  const origin = await request.post("/api/workspace", {
    headers: { origin: "https://attacker.example" },
    data: { action: "start" },
  });
  expect(origin.status()).toBe(403);
  const host = await request.get("/api/workspace", {
    headers: { host: "attacker.example:3000" },
  });
  expect(host.status()).toBe(403);
});

test("retention previews, requires confirmation, removes only expired unsaved articles", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings" })
    .click();
  await page
    .getByRole("button", { name: "Preview cleanup", exact: true })
    .click();
  await expect(page.getByText(/1 eligible article records/)).toBeVisible();
  const remove = page.getByRole("button", {
    name: "Remove 1 old article records",
    exact: true,
  });
  await expect(remove).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /I understand this removes/ })
    .check();
  await remove.click();
  await expect(page.getByText(/Removed 1 old article records/)).toBeVisible();
  await page
    .getByRole("button", { name: "Preview cleanup", exact: true })
    .click();
  await expect(page.getByText(/0 eligible article records/)).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Threat Intelligence" })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Demonstration: saved-expired-fixture",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Demonstration: expired-fixture",
      exact: true,
    }),
  ).toHaveCount(0);
  const blocked = await request.post("/api/retention", {
    headers: { origin: "https://attacker.example" },
    data: { action: "preview" },
  });
  expect(blocked.status()).toBe(403);
  const invalid = await request.post("/api/retention", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {
      action: "cleanup",
      confirmed: false,
      cutoff: new Date().toISOString(),
      ids: ["anything"],
    },
  });
  expect(invalid.status()).toBe(400);
});

test("article paging reaches records beyond 100 and date filters reset the page", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Threat Intelligence", exact: true })
    .click();
  await page.getByLabel("Filter source").selectOption("paging");
  await expect(page.getByText(/1–25 of 103 matching articles/)).toBeVisible();
  for (let i = 2; i <= 5; i++) {
    await page
      .getByRole("button", { name: "Next articles", exact: true })
      .click();
    await expect(
      page.getByText(new RegExp("Page " + i + " of 5")),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("link", { name: "Demonstration paging 000", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next articles", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Published from (UTC)", { exact: true })
    .fill("2026-11-25");
  await expect(
    page.getByText(/0–0 of 0 matching articles.*Page 1 of 1/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByLabel("Published from (UTC)", { exact: true })
    .fill("2026-11-25");
  await page
    .getByLabel("Published through (UTC)", { exact: true })
    .fill("2026-11-25");
  await expect(
    page.getByRole("link", {
      name: "Demonstration: phishing investigation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Demonstration paging 000", exact: true }),
  ).toHaveCount(0);
  for (const query of [
    "page=-1",
    "page=10001",
    "from=not-a-date",
    "from=2026-11-26&to=2026-11-25",
  ])
    expect((await request.get("/api/workspace?" + query)).status()).toBe(400);
});

test("CVE mentions distinguish local KEV evidence and watchlists persist through edit and removal", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Threat Intelligence", exact: true })
    .click();
  const article = page
    .locator("article")
    .filter({ hasText: "Demonstration: phishing investigation" });
  await expect(
    article.getByRole("link", { name: "CVE-2099-99999", exact: true }),
  ).toHaveAttribute("href", "https://www.cve.org/CVERecord?id=CVE-2099-99999");
  await expect(
    article.getByText("Listed in local CISA KEV", { exact: true }),
  ).toHaveCount(1);
  await expect(
    article.getByRole("link", { name: "CVE-2099-11111", exact: true }),
  ).toBeVisible();
  await expect(
    article.getByText(/record existence and article claims are not verified/),
  ).toBeVisible();
  await page.getByLabel("Watchlist name", { exact: true }).fill("Web stack");
  await page
    .getByLabel("Watchlist terms (one per line)", { exact: true })
    .fill("phishing");
  await page
    .getByRole("button", { name: "Create watchlist", exact: true })
    .click();
  await expect(
    page.getByText("Watchlist saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Threat Intelligence", exact: true })
    .click();
  await page
    .getByLabel("Filter watchlist", { exact: true })
    .selectOption({ label: "Web stack" });
  await expect(
    page.getByText("Matched watchlist terms: phishing", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/1–1 of 1 matching articles/)).toBeVisible();
  await page
    .getByRole("button", { name: "Edit watchlist Web stack", exact: true })
    .click();
  await page
    .getByLabel("Watchlist terms (one per line)", { exact: true })
    .fill("CVE-2099-11111");
  await page
    .getByRole("button", { name: "Save watchlist changes", exact: true })
    .click();
  await expect(
    page.getByText("Matched watchlist terms: cve-2099-11111", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Remove watchlist Web stack", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm removal", exact: true })
    .click();
  await expect(
    page.getByText("Watchlist removed. Articles were preserved.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    article.getByRole("link", {
      name: "Demonstration: phishing investigation",
      exact: true,
    }),
  ).toBeVisible();
  const blocked = await request.post("/api/watchlists", {
    headers: { origin: "https://attacker.example" },
    data: { action: "save", name: "Blocked", terms: ["test"] },
  });
  expect(blocked.status()).toBe(403);
  const invalid = await request.post("/api/watchlists", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: { action: "save", name: "Invalid", terms: [] },
  });
  expect(invalid.status()).toBe(400);
});

test("daily briefings persist across reload and filters, retain versions and archive history", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Your saved daily briefing" });
  await panel
    .getByRole("button", { name: "Generate today’s briefing", exact: true })
    .click();
  await expect(
    panel.getByText(
      "Daily briefing saved. Previous versions are retained in history.",
      { exact: true },
    ),
  ).toBeVisible();
  const day = await page.evaluate(() => {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  });
  const first = await (await request.get("/api/briefings?day=" + day)).json();
  expect(first.view.snapshot.news.length).toBeGreaterThan(0);
  await page.reload();
  await expect(
    panel.getByRole("button", {
      name: "Regenerate today’s briefing",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Search workspace", { exact: true })
    .fill("not-present-in-the-feed");
  await expect(
    page.getByRole("heading", {
      name: "No intelligence in this view yet",
      exact: true,
    }),
  ).toBeVisible();
  const unchanged = await (
    await request.get("/api/briefings?day=" + day)
  ).json();
  expect(unchanged.view).toEqual(first.view);
  await panel
    .getByRole("button", { name: "Regenerate today’s briefing", exact: true })
    .click();
  await expect(
    panel.getByText(
      "Daily briefing saved. Previous versions are retained in history.",
      { exact: true },
    ),
  ).toBeVisible();
  const second = await (await request.get("/api/briefings?day=" + day)).json();
  expect(second.currentId).not.toBe(first.currentId);
  expect(second.pagination.total).toBe(2);
  await panel
    .getByRole("button", { name: "Archive briefing", exact: true })
    .click();
  await expect(
    panel.getByText("Briefing archived. Its snapshot is retained in history.", {
      exact: true,
    }),
  ).toBeVisible();
  await panel.getByText("Briefing history", { exact: false }).click();
  await panel.locator('[data-briefing-id="' + first.currentId + '"]').click();
  await expect(panel.getByText(/Archived snapshot/)).toBeVisible();
  await panel.getByText("Show assessment answer", { exact: true }).click();
  await expect(panel.getByText(/No. Severity and evidence/)).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await request.post("/api/briefings", {
        headers: { origin: "https://attacker.example" },
        data: { action: "generate", day, timeZone: "UTC" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/briefings", {
        headers: { origin: "http://127.0.0.1:3100" },
        data: { action: "generate", day: "invalid", timeZone: "UTC" },
      })
    ).status(),
  ).toBe(400);
});

test("scheduled reviews persist, reschedule and retain completion history", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Daily Training" })
    .click();
  const panel = page.getByRole("region", { name: "Scheduled reviews" });
  await panel
    .getByLabel("Review topic", { exact: true })
    .fill("Review phishing evidence");
  await panel.getByLabel("Review due date", { exact: true }).fill("2026-01-01");
  await panel
    .getByRole("button", { name: "Schedule review", exact: true })
    .click();
  await expect(panel.getByText("Review saved.")).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Daily Training" })
    .click();
  await expect(
    panel.getByText("Review phishing evidence", { exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Reschedule review", exact: true })
    .click();
  await panel.getByLabel("Review due date", { exact: true }).fill("2099-01-01");
  await panel.getByRole("button", { name: "Save review date" }).click();
  await expect(panel.getByText(/Upcoming.*2099-01-01/)).toBeVisible();
  await panel.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(panel.getByText(/Completed.*2099-01-01/)).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const rejected = await page.request.post("/api/reviews", {
    headers: { Origin: "https://hostile.example" },
    data: { action: "create", title: "bad", dueDay: "2026-11-25" },
  });
  expect(rejected.status()).toBe(403);
});
