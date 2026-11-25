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
  await page
    .getByRole("button", { name: "Bookmark article", exact: true })
    .click();
  await page.getByRole("button", { name: "Mark read", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
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
