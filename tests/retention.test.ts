import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import {
  cleanupRetention,
  previewRetention,
  RETENTION_BATCH_SIZE,
} from "../src/services/retention";
const now = new Date("2026-11-25T16:00:00Z");
const old = "2026-01-01T00:00:00.000Z";
async function fixture() {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  const db = drizzle(client, { schema });
  await db.insert(schema.sources).values({
    id: "fixture",
    name: "Demonstration",
    url: "https://example.com",
  });
  const add = async (id: string, ingestedAt = old, bookmarked = false) =>
    db.insert(schema.articles).values({
      id,
      sourceId: "fixture",
      title: id,
      url: `https://example.com/${id}`,
      summary: "Synthetic",
      category: "Test",
      ingestedAt,
      bookmarked,
    });
  return { client, db, add };
}
it("previews without deleting; preserves recent items, boundary items, bookmarks and personal records", async () => {
  const { client, db, add } = await fixture();
  try {
    await add("old");
    await add("saved", old, true);
    await add("recent", now.toISOString());
    const cutoff = new Date(now.getTime() - 90 * 86400000).toISOString();
    await add("boundary", cutoff);
    await db.insert(schema.notes).values({
      id: "note",
      title: "Investigation",
      body: "https://example.com/old",
      tags: "",
      createdAt: old,
    });
    await db
      .insert(schema.tasks)
      .values({ id: "task", title: "Preserve", day: "2026-01-01" });
    await db.insert(schema.sessions).values({ id: "study", startedAt: old });
    const preview = await previewRetention(db, now);
    expect(preview.ids).toEqual(["old"]);
    expect(preview.eligibleCount).toBe(1);
    expect(await db.select().from(schema.articles)).toHaveLength(4);
    expect(
      await cleanupRetention(
        { action: "cleanup", confirmed: true, ...preview },
        db,
        now,
      ),
    ).toEqual({ deletedCount: 1 });
    expect(
      (await db.select().from(schema.articles)).map((item) => item.id).sort(),
    ).toEqual(["boundary", "recent", "saved"]);
    expect(await db.select().from(schema.notes)).toHaveLength(1);
    expect(await db.select().from(schema.tasks)).toHaveLength(1);
    expect(await db.select().from(schema.sessions)).toHaveLength(1);
  } finally {
    client.close();
  }
});
it("rechecks bookmarks and deletes only previewed IDs, with safe repeated submission", async () => {
  const { client, db, add } = await fixture();
  try {
    await add("old");
    const preview = await previewRetention(db, now);
    await client.execute("UPDATE articles SET bookmarked=1 WHERE id='old'");
    await add("not-previewed");
    const input = { action: "cleanup", confirmed: true, ...preview };
    expect(await cleanupRetention(input, db, now)).toEqual({ deletedCount: 0 });
    expect(await cleanupRetention(input, db, now)).toEqual({ deletedCount: 0 });
    expect(await db.select().from(schema.articles)).toHaveLength(2);
  } finally {
    client.close();
  }
});
it("rejects unconfirmed, stale and future cutoff requests", async () => {
  const { client, db, add } = await fixture();
  try {
    await add("old");
    const preview = await previewRetention(db, now);
    await expect(
      cleanupRetention({ action: "cleanup", ...preview }, db, now),
    ).rejects.toThrow();
    await expect(
      cleanupRetention(
        { action: "cleanup", confirmed: true, ...preview },
        db,
        new Date(now.getTime() + 16 * 60000),
      ),
    ).rejects.toThrow("expired");
    await expect(
      cleanupRetention(
        {
          action: "cleanup",
          confirmed: true,
          ids: ["old"],
          cutoff: now.toISOString(),
        },
        db,
        now,
      ),
    ).rejects.toThrow("expired");
    expect(await db.select().from(schema.articles)).toHaveLength(1);
  } finally {
    client.close();
  }
});
it("limits previews and confirmation payloads to bounded batches", async () => {
  const { client, db } = await fixture();
  try {
    for (let i = 0; i < RETENTION_BATCH_SIZE + 1; i++)
      await db.insert(schema.articles).values({
        id: String(i).padStart(64, "0"),
        sourceId: "fixture",
        title: "Demo",
        url: `https://example.com/${i}`,
        summary: "",
        category: "Test",
        ingestedAt: old,
      });
    const preview = await previewRetention(db, now);
    expect(preview.ids).toHaveLength(RETENTION_BATCH_SIZE);
    expect(preview.eligibleCount).toBe(RETENTION_BATCH_SIZE + 1);
    const input = { action: "cleanup", confirmed: true, ...preview };
    expect(Buffer.byteLength(JSON.stringify(input))).toBeLessThan(32768);
    expect(await cleanupRetention(input, db, now)).toEqual({
      deletedCount: RETENTION_BATCH_SIZE,
    });
    expect((await previewRetention(db, now)).eligibleCount).toBe(1);
  } finally {
    client.close();
  }
});
