import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import { listArticles } from "../src/services/intelligence";
import {
  deleteWatchlist,
  listWatchlists,
  saveWatchlist,
} from "../src/services/watchlists";
import { saveWatchlistInput } from "../src/lib/watchlists";
async function fixture() {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  return { client, db: drizzle(client, { schema }) };
}
it("creates, edits and deletes persistent literal watchlists without deleting article data", async () => {
  const { client, db } = await fixture();
  try {
    await db
      .insert(schema.sources)
      .values({ id: "demo", name: "Demo", url: "https://example.com" });
    for (const [id, title] of [
      ["one", "React vulnerability CVE-2099-99999"],
      ["two", "Cloud risk CVE-2099-11111"],
      ["three", "100% unsafe (a+)+$"],
    ])
      await db.insert(schema.articles).values({
        id,
        sourceId: "demo",
        title,
        url: `https://example.com/${id}`,
        summary: "",
        category: "Vulnerability",
        ingestedAt: new Date().toISOString(),
      });
    await db.insert(schema.vulnerabilities).values({
      id: "CVE-2099-99999",
      vendor: "Demo",
      product: "Test",
      name: "Synthetic",
      description: "Fixture only",
      action: "Test",
      addedAt: "2099-01-01",
      dueDate: "2099-01-01",
      ingestedAt: new Date().toISOString(),
    });
    const { id } = await saveWatchlist(
      { action: "save", name: "Web stack", terms: ["REACT", "react"] },
      db,
    );
    expect(await listWatchlists(db)).toEqual([
      { id, name: "Web stack", terms: ["react"] },
    ]);
    let result = await listArticles({ watchlistId: id }, db);
    expect(result.items.map((item) => item.id)).toEqual(["one"]);
    expect(result.items[0].matchedTerms).toEqual(["react"]);
    expect(result.items[0].cveMentions).toEqual([
      { id: "CVE-2099-99999", inKev: true },
    ]);
    await saveWatchlist(
      { action: "save", id, name: "Web stack", terms: ["Cloud", "100%"] },
      db,
    );
    result = await listArticles({ watchlistId: id }, db);
    expect(result.items.map((item) => item.id).sort()).toEqual([
      "three",
      "two",
    ]);
    expect(result.items.find((item) => item.id === "two")?.cveMentions).toEqual(
      [{ id: "CVE-2099-11111", inKev: false }],
    );
    await saveWatchlist(
      { action: "save", id, name: "Web stack", terms: ["(a+)+$"] },
      db,
    );
    expect(
      (await listArticles({ watchlistId: id }, db)).items.map(
        (item) => item.id,
      ),
    ).toEqual(["three"]);
    await expect(
      saveWatchlist(
        { action: "save", name: "WEB STACK", terms: ["other"] },
        db,
      ),
    ).rejects.toThrow("already exists");
    await expect(
      deleteWatchlist({ action: "delete", id, confirmed: false }, db),
    ).rejects.toThrow();
    await deleteWatchlist({ action: "delete", id, confirmed: true }, db);
    expect(await listWatchlists(db)).toEqual([]);
    expect(await db.select().from(schema.watchlistTerms)).toEqual([]);
    expect(await db.select().from(schema.articles)).toHaveLength(3);
    await expect(listArticles({ watchlistId: id }, db)).rejects.toThrow(
      "no longer exists",
    );
  } finally {
    client.close();
  }
});
it.each([
  { name: "", terms: ["react"] },
  { name: "Demo", terms: [] },
  { name: "Demo", terms: Array(11).fill("term") },
  { name: "Demo", terms: ["x".repeat(61)] },
])("rejects invalid watchlist input %j", (value) =>
  expect(
    saveWatchlistInput.safeParse({ action: "save", ...value }).success,
  ).toBe(false),
);
it("enforces the workspace list limit in the service", async () => {
  const { client, db } = await fixture();
  try {
    for (let i = 0; i < 50; i++)
      await saveWatchlist(
        { action: "save", name: `List ${i}`, terms: ["test"] },
        db,
      );
    await expect(
      saveWatchlist({ action: "save", name: "Overflow", terms: ["test"] }, db),
    ).rejects.toThrow("50");
    expect(await listWatchlists(db)).toHaveLength(50);
  } finally {
    client.close();
  }
});
