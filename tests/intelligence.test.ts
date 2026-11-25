import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import { listArticles } from "../src/services/intelligence";
import { intelligenceQuery } from "../src/lib/intelligence-query";
async function fixture() {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  const db = drizzle(client, { schema });
  await db
    .insert(schema.sources)
    .values({ id: "demo", name: "Demonstration", url: "https://example.com" });
  return { client, db };
}
it("pages beyond 100 rows in stable order and clamps pages after results shrink", async () => {
  const { client, db } = await fixture();
  try {
    for (let i = 0; i < 103; i++)
      await db.insert(schema.articles).values({
        id: String(i).padStart(3, "0"),
        sourceId: "demo",
        title: `Demo ${i}`,
        url: `https://example.com/${i}`,
        summary: "",
        category: "Test",
        ingestedAt: "2026-11-25T00:00:00.000Z",
        publishedAt: "2026-11-25T12:00:00.000Z",
      });
    const ids: string[] = [];
    for (let page = 1; page <= 5; page++) {
      const result = await listArticles({ page }, db);
      ids.push(...result.items.map((item) => item.id));
      expect(result.pagination.total).toBe(103);
      expect(result.items.length).toBeLessThanOrEqual(25);
    }
    expect(new Set(ids).size).toBe(103);
    expect(ids[0]).toBe("102");
    expect(ids.at(-1)).toBe("000");
    const clamped = await listArticles({ page: 10000, query: "Demo 102" }, db);
    expect(clamped.pagination.page).toBe(1);
    expect(clamped.pagination.totalPages).toBe(1);
    expect(clamped.items).toHaveLength(1);
  } finally {
    client.close();
  }
});
it("combines filters and includes UTC day boundaries without inventing missing dates", async () => {
  const { client, db } = await fixture();
  try {
    const dates = [
      null,
      "2026-11-24T23:59:59.999Z",
      "2026-11-25T00:00:00.000Z",
      "2026-11-25T23:59:59.999Z",
      "2026-11-26T00:00:00.000Z",
    ];
    for (const [i, publishedAt] of dates.entries())
      await db.insert(schema.articles).values({
        id: String(i),
        sourceId: "demo",
        title: "Demo ransomware",
        url: `https://example.com/${i}`,
        summary: "",
        category: "Ransomware",
        bookmarked: i === 2,
        ingestedAt: "2026-11-25T12:00:00.000Z",
        publishedAt,
      });
    const day = await listArticles(
      { from: "2026-11-25", to: "2026-11-25" },
      db,
    );
    expect(day.items.map((item) => item.id)).toEqual(["3", "2"]);
    const saved = await listArticles(
      {
        from: "2026-11-25",
        to: "2026-11-25",
        saved: true,
        category: "Ransomware",
        source: "demo",
        query: "ransomware",
      },
      db,
    );
    expect(saved.items.map((item) => item.id)).toEqual(["2"]);
    expect((await listArticles({}, db)).items).toHaveLength(5);
    expect(
      (await listArticles({ query: "' OR 1=1 --" }, db)).items,
    ).toHaveLength(0);
    const empty = await listArticles({ category: "Missing" }, db);
    expect(empty.pagination).toMatchObject({
      total: 0,
      page: 1,
      totalPages: 1,
      from: 0,
      to: 0,
    });
  } finally {
    client.close();
  }
});
it.each([
  { page: 0 },
  { page: -1 },
  { page: 10001 },
  { page: 1.5 },
  { page: "NaN" },
  { from: "2026-02-30" },
  { from: "2026-11-26", to: "2026-11-25" },
])("rejects malformed browsing input %j", (input) =>
  expect(intelligenceQuery.safeParse(input).success).toBe(false),
);
