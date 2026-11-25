import { migrateDatabase } from "../src/db/migrate";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import * as schema from "../src/db/schema";
import { ingest, persistSource } from "../src/services/feeds";
const now = "2026-11-25T15:00:00Z";
const entry = (cveID: string) => ({
  cveID,
  vendorProject: "Demo",
  product: "Synthetic",
  vulnerabilityName: "Fixture",
  shortDescription: "Demonstration only",
  requiredAction: "Test",
  dateAdded: "2026-11-25",
  dueDate: "2026-12-01",
});
it("normalizes refreshed metadata while preserving bookmarks, read state, ID and first ingestion time", async () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrateDatabase(client);
    await db.insert(schema.sources).values([
      { id: "krebs", name: "Demo one", url: "https://example.com/one" },
      { id: "bleeping", name: "Demo two", url: "https://example.com/two" },
    ]);
    const xml = (title: string) =>
      `<rss><channel><item><title>${title}</title><link>https://example.com/shared</link><description>Safe &amp;amp; short</description><pubDate>Wed, 25 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    await persistSource("krebs", xml("Original"), now, db);
    const [original] = await db.select().from(schema.articles);
    await client.execute("UPDATE articles SET bookmarked=1,read=1");
    await persistSource("bleeping", xml("Updated"), "2026-11-25T16:00:00Z", db);
    const rows = await db.select().from(schema.articles);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: original.id,
      title: "Updated",
      summary: "Safe & short",
      sourceId: "bleeping",
      bookmarked: true,
      read: true,
      ingestedAt: now,
    });
  } finally {
    client.close();
  }
});
it("keeps failed-source freshness and stored data while independent feeds succeed", async () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrateDatabase(client);
    await db.insert(schema.sources).values({
      id: "sans",
      name: "Demo",
      url: "https://example.com",
      lastSuccess: "2026-11-24T15:00:00Z",
    });
    await db.insert(schema.articles).values({
      id: "retained",
      sourceId: "sans",
      title: "Retained",
      url: "https://example.com/retained",
      summary: "",
      category: "Test",
      ingestedAt: now,
      bookmarked: true,
    });
    await ingest(
      db,
      async (url) =>
        url.includes("isc.sans")
          ? "<html><body>Not a feed</body></html>"
          : url.includes("cisa.gov")
            ? '{"vulnerabilities":[]}'
            : "<rss><channel><title>Demonstration</title></channel></rss>",
      () => new Date(now),
    );
    const sources = await db.select().from(schema.sources);
    expect(sources.find((source) => source.id === "sans")).toMatchObject({
      lastSuccess: "2026-11-24T15:00:00Z",
      error: "Refresh failed: network, format, or size error",
      consecutiveFailures: 1,
    });
    expect(sources.find((source) => source.id === "krebs")?.lastSuccess).toBe(
      new Date(now).toISOString(),
    );
    expect(await db.select().from(schema.articles)).toHaveLength(1);
  } finally {
    client.close();
  }
});
it("rolls back a partially written catalog and preserves last successful refresh", async () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrateDatabase(client);
    await client.execute(
      "INSERT INTO sources(id,name,url,last_success) VALUES ('cisa','CISA','https://example.com','previous')",
    );
    await client.execute(
      "CREATE TRIGGER fail_second BEFORE INSERT ON vulnerabilities WHEN NEW.id = 'CVE-2099-99999' BEGIN SELECT RAISE(ABORT,'simulated write failure'); END",
    );
    await expect(
      persistSource(
        "cisa",
        JSON.stringify({
          vulnerabilities: [entry("CVE-2099-11111"), entry("CVE-2099-99999")],
        }),
        now,
        db,
      ),
    ).rejects.toThrow();
    expect(
      (await client.execute("SELECT * FROM vulnerabilities")).rows,
    ).toHaveLength(0);
    expect(
      (await client.execute("SELECT last_success FROM sources WHERE id='cisa'"))
        .rows[0].last_success,
    ).toBe("previous");
    await persistSource(
      "cisa",
      JSON.stringify({ vulnerabilities: [entry("CVE-2099-11111")] }),
      now,
      db,
    );
    expect(
      (await client.execute("SELECT * FROM vulnerabilities")).rows,
    ).toHaveLength(1);
    expect(
      (await client.execute("SELECT last_success FROM sources WHERE id='cisa'"))
        .rows[0].last_success,
    ).toBe(now);
  } finally {
    client.close();
  }
});
it("rejects malformed catalog records before committing any changes", async () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrateDatabase(client);
    await expect(
      persistSource(
        "cisa",
        JSON.stringify({
          vulnerabilities: [entry("CVE-2099-11111"), entry("not-a-cve")],
        }),
        now,
        db,
      ),
    ).rejects.toThrow();
    expect(
      (await client.execute("SELECT * FROM vulnerabilities")).rows,
    ).toHaveLength(0);
  } finally {
    client.close();
  }
});
