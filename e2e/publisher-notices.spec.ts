import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("publisher notices accompany API data, render offline and download without publisher requests", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3100/"))
      externalRequests.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Threat Intelligence", exact: true })
    .click();
  const article = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Demonstration: phishing investigation",
      exact: true,
    }),
  });
  await expect(
    article.getByText(/Synthetic publisher notice retained for tests/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const notices = page.getByRole("region", {
    name: "Publisher attribution and license notices",
  });
  await expect(
    notices.getByText(/Copyright © 1999-2026, The MITRE Corporation/),
  ).toBeVisible();
  await notices.getByText("CVE Program — full notice", { exact: true }).click();
  await expect(
    notices.getByText(/Any copy you make for such purposes is authorized/),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const downloaded = await Promise.all([
    page.waitForEvent("download"),
    notices.getByRole("link", { name: "Download publisher notices" }).click(),
  ]);
  expect(downloaded[0].suggestedFilename()).toBe(
    "gapsound-publisher-notices.json",
  );
  const response = await page.request.get("/api/notices");
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const bundle = await response.json();
  expect(
    bundle.items.find((notice: { id: string }) => notice.id === "cve").text,
  ).toContain("MITRE's copyright designation");
  const cves = await (await page.request.get("/api/cves?saved=false")).json();
  expect(cves.publisherNotices).toEqual(bundle);
  expect(
    cves.items.find((item: { id: string }) => item.id === "CVE-2099-99999")
      .snapshot.publisherNotices.items[0].id,
  ).toBe("cve");
  expect(
    (
      await page.request.get("/api/notices", {
        headers: { Origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
  expect(externalRequests).toEqual([]);
});
