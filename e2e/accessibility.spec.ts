import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const screens = [
  "Command Center",
  "Threat Intelligence",
  "CVE Watchtower",
  "Daily Training",
  "Research Notebook",
  "Settings",
];
for (const width of [1280, 320])
  for (const name of screens)
    test(
      "accessibility: " + name + " at " + width + "px",
      async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/");
        await expect(
          page.getByRole("link", {
            name: "Demonstration: phishing investigation",
          }),
        ).toBeVisible();
        if (name !== "Command Center")
          await page
            .getByRole("navigation")
            .getByRole("button", { name, exact: true })
            .click();
        await expect(
          page.getByRole("heading", { name, exact: true, level: 1 }),
        ).toBeVisible();
        const result = await new AxeBuilder({ page }).analyze();
        expect(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        ).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        if (name === "Command Center")
          await page.screenshot({
            path: testInfo.outputPath("command-center.png"),
          });
      },
    );
test("accessibility: keyboard skip link, search shortcut, navigation and collapsed names", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Demonstration: phishing investigation" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("textbox", { name: "Search workspace" }),
  ).toBeFocused();
  const collapse = page.getByRole("button", { name: "Collapse navigation" });
  await collapse.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Expand navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  for (const name of screens)
    await expect(
      page.getByRole("navigation").getByRole("button", { name, exact: true }),
    ).toBeVisible();
  const settings = page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true });
  await settings.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeFocused();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Command Center", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Command Center", level: 1 }),
  ).toBeFocused();
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
});
test("accessibility: successful actions announce feedback without moving form focus", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Daily Training", exact: true })
    .click();
  const input = page.getByLabel("New study objective");
  await input.fill("Keyboard study objective");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Study objective added." }),
  ).toBeVisible();
  await expect(input).toBeFocused();
  await expect(
    page.getByRole("progressbar", {
      name: "Completed study minutes toward weekly goal",
    }),
  ).toBeVisible();
});
