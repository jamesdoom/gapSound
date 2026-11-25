import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it, vi } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import { ingest } from "../src/services/feeds";
import { SourceHttpError } from "../src/lib/feed-network";
const start = Date.parse("2026-11-25T16:00:00Z");
it("upgrades an existing database without losing user records and only applies once", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await client.executeMultiple(
      readFileSync("migrations/0001_foundation.sql", "utf8"),
    );
    await client.execute(
      "CREATE TABLE migrations(id TEXT PRIMARY KEY,applied_at TEXT NOT NULL)",
    );
    await client.execute("INSERT INTO migrations VALUES ('0001','previous')");
    await client.execute(
      "INSERT INTO sources(id,name,url) VALUES ('source','Original','https://example.com')",
    );
    expect(await migrateDatabase(client)).toEqual(["0002"]);
    expect(await migrateDatabase(client)).toEqual([]);
    const [row] = (await client.execute("SELECT * FROM sources")).rows;
    expect(row.name).toBe("Original");
    expect(row.consecutive_failures).toBe(0);
    expect(row.next_attempt_at).toBeNull();
  } finally {
    client.close();
  }
});
it("isolates 429/503 failures, persists across reopen, skips early retries and resets on recovery", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gapsound-backoff-"));
  const url = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
  let client = createClient({ url });
  let clockTime = start;
  const clock = () => new Date(clockTime);
  const healthy = "<rss><channel></channel></rss>";
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("isc.sans")) throw new SourceHttpError(429, "7200");
    if (url.includes("cisa.gov"))
      throw new SourceHttpError(503, "Wed, 25 Nov 2026 19:00:00 GMT");
    return healthy;
  });
  try {
    await migrateDatabase(client);
    await ingest(drizzle(client, { schema }), fetcher, clock);
    expect(fetcher).toHaveBeenCalledTimes(4);
    const rows = (await client.execute("SELECT * FROM sources")).rows;
    expect(rows.find((r) => r.id === "sans")?.next_attempt_at).toBe(
      "2026-11-25T18:00:00.000Z",
    );
    expect(rows.find((r) => r.id === "cisa")?.next_attempt_at).toBe(
      "2026-11-25T19:00:00.000Z",
    );
    expect(rows.find((r) => r.id === "krebs")?.last_success).toBe(
      "2026-11-25T16:00:00.000Z",
    );
    client.close();
    client = createClient({ url });
    fetcher.mockClear();
    clockTime += 60 * 60000;
    await ingest(drizzle(client, { schema }), fetcher, clock);
    expect(fetcher).toHaveBeenCalledTimes(2); // Healthy feeds only; persisted provider delays win.
    const recover = vi.fn(async (url: string) =>
      url.includes("cisa.gov") ? '{"vulnerabilities":[]}' : healthy,
    );
    clockTime = start + 3 * 3600000;
    await ingest(drizzle(client, { schema }), recover, clock);
    const recovered = (
      await client.execute("SELECT * FROM sources WHERE id='sans'")
    ).rows[0];
    expect(recovered.error).toBeNull();
    expect(recovered.consecutive_failures).toBe(0);
    expect(recovered.last_success).toBe("2026-11-25T19:00:00.000Z");
  } finally {
    client.close();
  }
});
