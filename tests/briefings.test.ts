import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import {
  archiveBriefing,
  generateBriefing,
  readBriefings,
} from "../src/services/briefings";
import { briefingSnapshot, calendarDay } from "../src/lib/briefings";
const now = new Date("2026-11-25T16:00:00Z");
const input = {
  action: "generate",
  day: "2026-11-25",
  timeZone: "America/New_York",
};
it("rolls back both archive and replacement when regeneration fails", async () => {
  const { client, db } = await fixture();
  try {
    const first = await generateBriefing(input, db, now);
    await client.execute(
      "CREATE TRIGGER fail_regeneration BEFORE INSERT ON daily_briefings BEGIN SELECT RAISE(ABORT,'simulated failure'); END",
    );
    await expect(
      generateBriefing(input, db, new Date(now.getTime() + 1000)),
    ).rejects.toThrow();
    const current = await readBriefings(input.day, 1, undefined, db);
    expect(current.currentId).toBe(first.id);
    expect(current.view?.archivedAt).toBeNull();
    expect(current.pagination.total).toBe(1);
  } finally {
    client.close();
  }
});
async function fixture() {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  return { client, db: drizzle(client, { schema }) };
}
it("builds bounded, source-backed snapshots with relevance, freshness, objectives and honest review prompts", async () => {
  const { client, db } = await fixture();
  try {
    await db.insert(schema.sources).values([
      {
        id: "sans",
        name: "SANS demo",
        url: "https://example.com",
        lastSuccess: now.toISOString(),
      },
      {
        id: "krebs",
        name: "Demo stale",
        url: "https://example.com/stale",
        lastSuccess: "2026-11-24T16:00:00Z",
      },
      {
        id: "cisa",
        name: "CISA demo",
        url: "https://example.com/catalog",
        error: "Offline",
      },
    ]);
    const { saveWatchlist } = await import("../src/services/watchlists");
    await saveWatchlist(
      { action: "save", name: "Stack", terms: ["react"] },
      db,
    );
    for (const [id, title, publishedAt] of [
      ["old", "Old react", "2026-01-01T00:00:00Z"],
      ["recent", "Recent generic", "2026-11-25T15:59:00Z"],
      ["relevant", "React research", "2026-11-24T15:00:00Z"],
      ["future", "Future", "2027-01-01T00:00:00Z"],
      ["unknown", "Unknown", null],
    ] as const)
      await db.insert(schema.articles).values({
        id,
        sourceId: "sans",
        title,
        url: `https://example.com/${id}`,
        summary: "Demonstration",
        category: "Test",
        ingestedAt: now.toISOString(),
        publishedAt,
      });
    await db.insert(schema.tasks).values([
      { id: "today", title: "Read advisory", day: "2026-11-25", done: false },
      {
        id: "review",
        title: "Origin validation",
        day: "2026-11-24",
        done: true,
      },
    ]);
    for (const [id, addedAt] of [
      ["CVE-2099-11111", "2026-11-24"],
      ["CVE-2099-22222", "2099-01-01"],
    ] as const)
      await db.insert(schema.vulnerabilities).values({
        id,
        name: "Synthetic vulnerability",
        vendor: "Demo",
        product: "Test",
        description: "Demo",
        action: "Test remediation",
        addedAt,
        dueDate: "2099-01-01",
        ingestedAt: now.toISOString(),
      });
    await generateBriefing(input, db, now);
    const result = await readBriefings(input.day, 1, undefined, db);
    const snap = result.view!.snapshot;
    expect(snap.news.map((item) => item.title)).toEqual([
      "React research",
      "Recent generic",
    ]);
    expect(snap.news[0].matchedTerms).toEqual(["react"]);
    expect(snap.kevs.map((item) => item.id)).toEqual(["CVE-2099-11111"]);
    expect(snap.sources.map((item) => item.status)).toEqual([
      "fresh",
      "stale",
      "missing",
      "error",
    ]);
    expect(snap.objectives).toEqual([{ title: "Read advisory", done: false }]);
    expect(snap.reviewPrompts).toEqual([
      { title: "Origin validation", day: "2026-11-24" },
    ]);
    await client.execute("UPDATE articles SET title='Changed after snapshot'");
    expect(
      (await readBriefings(input.day, 1, undefined, db)).view?.snapshot,
    ).toEqual(snap);
    await client.execute("DELETE FROM articles");
    expect(
      (await readBriefings(input.day, 1, undefined, db)).view?.snapshot.news,
    ).toHaveLength(2);
  } finally {
    client.close();
  }
});
it("retains prior versions, enforces one active snapshot and supports archive/empty data/history paging", async () => {
  const { client, db } = await fixture();
  try {
    expect((await readBriefings(input.day, 1, undefined, db)).view).toBeNull();
    const first = await generateBriefing(input, db, now);
    await generateBriefing(input, db, new Date(now.getTime() + 1000));
    const result = await readBriefings(input.day, 1, first.id, db);
    expect(result.view?.archivedAt).not.toBeNull();
    expect(result.view?.snapshot.news).toEqual([]);
    expect(result.view?.snapshot.kevs).toEqual([]);
    expect(
      result.view?.snapshot.sources.every((item) => item.status === "missing"),
    ).toBe(true);
    expect(result.currentId).not.toBe(first.id);
    await archiveBriefing(result.currentId!, db, now);
    expect((await readBriefings(input.day, 1, undefined, db)).view).toBeNull();
    for (let i = 0; i < 10; i++)
      await generateBriefing(input, db, new Date(now.getTime() + i * 10000));
    const page = await readBriefings(input.day, 2, undefined, db);
    expect(page.history).toHaveLength(2);
    expect(page.pagination.total).toBe(12);
  } finally {
    client.close();
  }
});
it("persists snapshots across database close/reopen", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gapsound-briefing-"));
  const url = `file:${join(directory, "test.db").replaceAll("\\", "/")}`;
  let client = createClient({ url });
  try {
    await migrateDatabase(client);
    const saved = await generateBriefing(
      input,
      drizzle(client, { schema }),
      now,
    );
    client.close();
    client = createClient({ url });
    const result = await readBriefings(
      input.day,
      1,
      saved.id,
      drizzle(client, { schema }),
    );
    expect(result.view?.snapshot.generatedAt).toBe(now.toISOString());
  } finally {
    client.close();
  }
});
it("validates local calendar days, timezones, snapshot links and unsafe content boundaries", async () => {
  expect(
    calendarDay(new Date("2026-11-25T02:00:00Z"), "America/New_York"),
  ).toBe("2026-11-24");
  const { client, db } = await fixture();
  try {
    await expect(
      generateBriefing({ ...input, day: "2026-11-24" }, db, now),
    ).rejects.toThrow("current local day");
    await expect(
      generateBriefing({ ...input, timeZone: "not/a/timezone" }, db, now),
    ).rejects.toThrow("time zone");
    await generateBriefing(input, db, now);
    const snapshot = (await readBriefings(input.day, 1, undefined, db)).view!
      .snapshot;
    expect(
      briefingSnapshot.safeParse({
        ...snapshot,
        learning: { ...snapshot.learning, url: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
  } finally {
    client.close();
  }
});

it("keeps source freshness aligned with a publisher floor when preferences request faster checks", async () => {
  const { client, db } = await fixture();
  try {
    const { eq } = await import("drizzle-orm");
    await db
      .update(schema.settings)
      .set({ refreshMinutes: 15 })
      .where(eq(schema.settings.id, "local"));
    const timestamp = new Date(now.getTime() - 45 * 60000).toISOString();
    await db.insert(schema.sources).values([
      {
        id: "sans",
        name: "SANS",
        url: "https://isc.sans.edu/rssfeed.xml",
        lastSuccess: timestamp,
      },
      {
        id: "krebs",
        name: "Krebs",
        url: "https://krebsonsecurity.com/feed/",
        lastSuccess: timestamp,
      },
    ]);
    await generateBriefing(input, db, now);
    const snapshot = (await readBriefings(input.day, 1, undefined, db)).view!
      .snapshot;
    expect(snapshot.sources.find((s) => s.name.includes("SANS"))?.status).toBe(
      "fresh",
    );
    expect(snapshot.sources.find((s) => s.name.includes("Krebs"))?.status).toBe(
      "stale",
    );
  } finally {
    client.close();
  }
});
