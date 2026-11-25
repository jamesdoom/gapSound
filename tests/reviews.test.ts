import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import { readReviews, updateReview } from "../src/services/reviews";
import { generateBriefing, readBriefings } from "../src/services/briefings";
import { briefingSnapshot } from "../src/lib/briefings";
it("retains completions, reschedules pending reviews and captures immutable due snapshots with legacy support", async () => {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  const db = drizzle(client, { schema });
  try {
    const now = new Date("2026-11-25T16:00:00Z");
    const overdue = await updateReview(
      { action: "create", title: " Review phishing ", dueDay: "2026-11-24" },
      db,
      now,
    );
    const future = await updateReview(
      { action: "create", title: "Future", dueDay: "2026-11-26" },
      db,
      now,
    );
    const completed = await updateReview(
      { action: "create", title: "Finished", dueDay: "2026-11-23" },
      db,
      now,
    );
    await updateReview({ action: "complete", id: completed.id }, db, now);
    const input = {
      action: "generate",
      day: "2026-11-25",
      timeZone: "America/New_York",
    };
    const first = await generateBriefing(input, db, now);
    const saved = (await readBriefings(input.day, 1, first.id, db)).view!
      .snapshot;
    expect(saved.version).toBe(2);
    if (saved.version !== 2) throw new Error("Expected new snapshot");
    expect(saved.dueReviewCount).toBe(1);
    expect(saved.dueReviews.map((r) => r.id)).toEqual([overdue.id]);
    await updateReview(
      { action: "reschedule", id: overdue.id, dueDay: "2026-11-27" },
      db,
    );
    await updateReview(
      { action: "reschedule", id: future.id, dueDay: "2026-11-25" },
      db,
    );
    await expect(
      updateReview(
        { action: "reschedule", id: completed.id, dueDay: "2026-11-26" },
        db,
      ),
    ).rejects.toThrow("completed");
    await expect(
      updateReview({ action: "complete", id: completed.id }, db),
    ).rejects.toThrow("completed");
    const second = await generateBriefing(input, db, now);
    const current = (await readBriefings(input.day, 1, second.id, db)).view!
      .snapshot;
    if (current.version !== 2) throw new Error("Expected version2");
    expect(current.dueReviews.map((r) => r.id)).toEqual([future.id]);
    expect(
      (await readBriefings(input.day, 1, first.id, db)).view!.snapshot,
    ).toEqual(saved);
    expect(briefingSnapshot.parse({ ...saved, version: 1 }).version).toBe(1);
    const records = await readReviews(1, db);
    expect(records.total).toBe(3);
    expect(records.items.find((r) => r.id === completed.id)?.completedAt).toBe(
      now.toISOString(),
    );
    for (const bad of [
      { action: "create", title: " ", dueDay: "2026-11-25" },
      { action: "create", title: "Topic", dueDay: "2026-02-30" },
      { action: "complete", id: "bad" },
    ])
      await expect(updateReview(bad, db)).rejects.toThrow();
  } finally {
    client.close();
  }
});
it("paginates without dropping pending or completed records", async () => {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  const db = drizzle(client, { schema });
  try {
    for (let i = 0; i < 21; i++)
      await updateReview(
        { action: "create", title: "Topic " + i, dueDay: "2026-11-25" },
        db,
      );
    const first = await readReviews(1, db),
      second = await readReviews(2, db);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(1);
    expect(
      new Set([...first.items, ...second.items].map((r) => r.id)).size,
    ).toBe(21);
  } finally {
    client.close();
  }
});

it("persists review dates and completions across database reconnects", async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const url =
    "file:" +
    join(
      mkdtempSync(join(tmpdir(), "gapsound-reviews-")),
      "reviews.db",
    ).replaceAll("\\", "/");
  const first = createClient({ url });
  await migrateDatabase(first);
  const db = drizzle(first, { schema });
  const record = await updateReview(
    { action: "create", title: "Persistent review", dueDay: "2026-11-25" },
    db,
  );
  await updateReview({ action: "complete", id: record.id }, db);
  first.close();
  const second = createClient({ url });
  try {
    const result = await readReviews(1, drizzle(second, { schema }));
    expect(result.items[0].title).toBe("Persistent review");
    expect(result.items[0].completedAt).not.toBeNull();
    expect(result.items[0].dueDay).toBe("2026-11-25");
  } finally {
    second.close();
  }
});
