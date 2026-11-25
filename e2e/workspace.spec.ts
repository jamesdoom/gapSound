import { expect, test } from "@playwright/test";
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
