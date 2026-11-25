import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
test("full Next.js restart preserves the complete personal workspace", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const directory = mkdtempSync(join(tmpdir(), "gapsound-restart-"));
  const baseURL = "http://127.0.0.1:3101";
  const env = {
    ...process.env,
    GAPSOUND_DATA_DIR: directory,
    GAPSOUND_PORT: "3101",
  };
  let server: ChildProcess | undefined;
  let log = "";
  async function stop() {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      server.kill();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          exited,
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("Test-owned server did not exit")),
              10000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    }
    server = undefined;
  }
  async function start() {
    let ready = false;
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3101",
      ],
      { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    for (const stream of [server.stdout, server.stderr])
      stream?.on("data", (chunk) => {
        log = (log + chunk.toString()).slice(-12000);
        if (chunk.toString().includes("Ready")) ready = true;
      });
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (server.exitCode !== null)
        throw new Error("Restart server exited: " + log);
      try {
        if (
          ready &&
          (
            await fetch(baseURL + "/api/workspace", {
              signal: AbortSignal.timeout(2000),
            })
          ).ok
        )
          return server.pid;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Restart server not ready: " + log);
  }
  const seed = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/seed-e2e.ts"],
    { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  let seedLog = "";
  seed.stderr.on("data", (chunk) => (seedLog += chunk.toString()));
  const seedTimer = setTimeout(() => seed.kill(), 20000);
  const [code] = await once(seed, "exit");
  clearTimeout(seedTimer);
  expect(code, seedLog).toBe(0);
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  try {
    const firstPid = await start();
    await page.goto("/");
    const post = async (data: unknown) => {
      const response = await context.request.post("/api/workspace", {
        headers: { Origin: baseURL },
        data,
      });
      expect(response.ok()).toBe(true);
    };
    await post({
      action: "article",
      id: "fixture-article",
      bookmarked: true,
      read: true,
    });
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
    const timeZone = await page.evaluate(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    await post({ action: "task", title: "Restart objective", day });
    await post({ action: "start" });
    await post({ action: "settings", weeklyHours: 17, refreshMinutes: 120 });
    const noteResponse = await context.request.post("/api/notebook", {
      headers: { Origin: baseURL },
      data: {
        action: "note",
        title: "Restart evidence",
        body: "**Persistent evidence**",
        tags: "restart, evidence",
      },
    });
    expect(noteResponse.ok()).toBe(true);
    const note = await noteResponse.json();
    const edit = await context.request.post("/api/notebook", {
      headers: { Origin: baseURL },
      data: {
        action: "note",
        id: note.id,
        revision: 0,
        title: "Restart evidence",
        body: "**Persistent edited evidence**",
        tags: "restart, verified",
      },
    });
    expect(edit.ok()).toBe(true);
    const watch = await context.request.post("/api/watchlists", {
      headers: { Origin: baseURL },
      data: { action: "save", name: "Restart watchlist", terms: ["phishing"] },
    });
    expect(watch.ok()).toBe(true);
    const review = await context.request.post("/api/reviews", {
      headers: { Origin: baseURL },
      data: { action: "create", title: "Restart review", dueDay: day },
    });
    expect(review.ok()).toBe(true);
    const save = await context.request.post("/api/cves", {
      headers: { Origin: baseURL },
      data: { action: "save", id: "CVE-2099-99999", saved: true },
    });
    expect(save.ok()).toBe(true);
    const brief = await context.request.post("/api/briefings", {
      headers: { Origin: baseURL },
      data: { action: "generate", day, timeZone },
    });
    expect(brief.ok()).toBe(true);
    const briefing = await brief.json();
    const before = await (
      await context.request.get("/api/workspace?day=" + day)
    ).json();
    const active = before.sessions.find(
      (s: { endedAt: string | null }) => !s.endedAt,
    );
    expect(active).toBeDefined();
    await post({
      action: "toggle-task",
      id: before.checklist.find(
        (t: { title: string }) => t.title === "Restart objective",
      ).id,
      done: true,
    });
    const briefingBefore = await (
      await context.request.get("/api/briefings?day=" + day)
    ).json();
    await stop();
    await expect
      .poll(async () => {
        try {
          await fetch(baseURL);
          return false;
        } catch {
          return true;
        }
      })
      .toBe(true);
    const secondPid = await start();
    expect(secondPid).not.toBe(firstPid);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Stop session", exact: true }),
    ).toBeVisible();
    const after = await (
      await context.request.get("/api/workspace?day=" + day)
    ).json();
    expect(
      after.sessions.find((s: { endedAt: string | null }) => !s.endedAt).id,
    ).toBe(active.id);
    expect(after.settings.weeklyHours).toBe(17);
    expect(after.settings.refreshMinutes).toBe(120);
    expect(
      after.checklist.find(
        (t: { title: string }) => t.title === "Restart objective",
      ).done,
    ).toBe(true);
    expect(
      after.checklist.some(
        (t: { title: string }) => t.title === "Restart objective",
      ),
    ).toBe(true);
    expect(
      after.watchlists.some(
        (w: { name: string }) => w.name === "Restart watchlist",
      ),
    ).toBe(true);
    const article = after.items.find(
      (a: { id: string }) => a.id === "fixture-article",
    );
    expect(article.bookmarked).toBe(true);
    expect(article.read).toBe(true);
    expect(
      after.sources.find((s: { id: string }) => s.id === "fixture-delay")
        .nextAttemptAt,
    ).toBe(
      before.sources.find((s: { id: string }) => s.id === "fixture-delay")
        .nextAttemptAt,
    );
    const notes = await (
      await context.request.get("/api/notebook?q=Restart%20evidence")
    ).json();
    expect(notes.items[0].id).toBe(note.id);
    expect(notes.items[0].revision).toBe(1);
    expect(notes.items[0].body).toBe("**Persistent edited evidence**");
    expect(notes.tags.some((t: { tag: string }) => t.tag === "restart")).toBe(
      true,
    );
    expect(
      (await (await context.request.get("/api/reviews")).json()).items.some(
        (r: { title: string }) => r.title === "Restart review",
      ),
    ).toBe(true);
    const cves = await (
      await context.request.get("/api/cves?saved=true")
    ).json();
    expect(cves.items[0].id).toBe("CVE-2099-99999");
    expect(cves.items[0].snapshot.metrics[0].score).toBe(9.8);
    const cached = await context.request.post("/api/cves", {
      headers: { Origin: baseURL },
      data: { action: "lookup", id: "CVE-2099-99999" },
    });
    expect((await cached.json()).cached).toBe(true);
    const briefAfter = await (
      await context.request.get("/api/briefings?day=" + day)
    ).json();
    expect(briefAfter.currentId).toBe(briefing.id);
    expect(briefAfter.view.snapshot).toEqual(briefingBefore.view.snapshot);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Research Notebook" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Restart evidence", exact: true }),
    ).toBeVisible();
    await post({ action: "stop", id: active.id });
    const reviewId = (await review.json()).id;
    const completeReview = await context.request.post("/api/reviews", {
      headers: { Origin: baseURL },
      data: { action: "complete", id: reviewId },
    });
    expect(completeReview.ok()).toBe(true);
    const archive = await context.request.post("/api/briefings", {
      headers: { Origin: baseURL },
      data: { action: "archive", id: briefing.id },
    });
    expect(archive.ok()).toBe(true);
    await stop();
    await start();
    const final = await (
      await context.request.get("/api/workspace?day=" + day)
    ).json();
    expect(
      final.sessions.find((s: { id: string }) => s.id === active.id).endedAt,
    ).not.toBeNull();
    const archived = await (
      await context.request.get(
        "/api/briefings?day=" + day + "&id=" + briefing.id,
      )
    ).json();
    expect(archived.view.archivedAt).not.toBeNull();
    expect(
      (await (await context.request.get("/api/reviews")).json()).items.find(
        (r: { id: string }) => r.id === reviewId,
      ).completedAt,
    ).not.toBeNull();
    expect(archived.view.snapshot).toEqual(briefingBefore.view.snapshot);
  } finally {
    await context.close();
    await stop();
  }
});
