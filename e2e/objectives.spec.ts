import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("objective plans edit, reorder and apply once without rewriting daily records", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Daily Training", exact: true })
    .click();
  const plan = page.getByRole("region", { name: "Reusable objective plan" });
  await expect(
    plan.getByRole("button", { name: "Add plan objective" }),
  ).toBeEnabled();
  await plan.getByRole("button", { name: "Add plan objective" }).click();
  await plan
    .getByLabel("Plan objective 1", { exact: true })
    .fill("Plan DNS review");
  await plan.getByRole("button", { name: "Add plan objective" }).click();
  await plan
    .getByLabel("Plan objective 2", { exact: true })
    .fill("Plan TLS review");
  await plan.getByRole("button", { name: "Move up objective 2" }).click();
  await expect(
    plan.getByLabel("Plan objective 1", { exact: true }),
  ).toHaveValue("Plan TLS review");
  await plan.getByRole("button", { name: "Save objective plan" }).click();
  await expect(plan.getByRole("status")).toContainText("Objective plan saved");
  await plan.getByRole("button", { name: "Apply saved plan to today" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Plan TLS review", exact: true }),
  ).toBeVisible();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/workspace") &&
        response.request().method() === "POST",
    ),
    page
      .getByRole("checkbox", { name: "Plan TLS review", exact: true })
      .click(),
  ]);
  await expect(
    page.getByRole("checkbox", { name: "Plan TLS review", exact: true }),
  ).toBeChecked();
  const { day } = await page.evaluate(() => {
    const now = new Date();
    return {
      day: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });
  const before = await (
    await page.request.get("/api/workspace?day=" + day)
  ).json();
  expect(
    before.checklist
      .filter((t: { title: string }) => t.title.startsWith("Plan "))
      .map((t: { title: string }) => t.title),
  ).toEqual(["Plan TLS review", "Plan DNS review"]);
  await plan
    .getByLabel("Plan objective 1", { exact: true })
    .fill("Future TLS objective");
  await plan
    .getByRole("button", { name: "Remove objective 2 from plan" })
    .click();
  await expect(
    plan.getByRole("button", { name: "Apply saved plan to today" }),
  ).toBeDisabled();
  await plan.getByRole("button", { name: "Save objective plan" }).click();
  await expect(plan.getByRole("status")).toContainText("Objective plan saved");
  await plan.getByRole("button", { name: "Apply saved plan to today" }).click();
  await expect(plan.getByRole("alert")).toContainText("already been applied");
  await page.reload();
  await page
    .getByRole("button", { name: "Daily Training", exact: true })
    .click();
  await expect(
    plan.getByLabel("Plan objective 1", { exact: true }),
  ).toHaveValue("Future TLS objective");
  await expect(
    page.getByRole("checkbox", { name: "Plan TLS review", exact: true }),
  ).toBeChecked();
  const after = await (
    await page.request.get("/api/workspace?day=" + day)
  ).json();
  expect(after.checklist).toEqual(before.checklist);
  expect(
    (
      await page.request.get("/api/objectives", {
        headers: { Origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
  const saved = await (await page.request.get("/api/objectives")).json();
  expect(
    (
      await page.request.post("/api/objectives", {
        data: { action: "save", revision: saved.revision, titles: [] },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/objectives", {
        headers: { Origin: "http://127.0.0.1:3100" },
        data: {
          action: "save",
          revision: saved.revision,
          titles: ["x".repeat(33000)],
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/objectives", {
        headers: { Origin: "http://127.0.0.1:3100" },
        data: {
          action: "save",
          revision: saved.revision - 1,
          titles: ["Stale"],
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post("/api/objectives", {
        headers: { Origin: "http://127.0.0.1:3100" },
        data: {
          action: "save",
          revision: saved.revision,
          titles: ["Same", "same"],
        },
      })
    ).status(),
  ).toBe(400);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
