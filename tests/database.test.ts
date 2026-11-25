import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { expect, it } from "vitest";
it("migrates a clean database, enforces one active session, and preserves article state on upsert", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await client.executeMultiple(
      readFileSync("migrations/0001_foundation.sql", "utf8"),
    );
    await client.execute(
      "INSERT INTO sessions VALUES ('one','2026-11-25T10:00:00Z',NULL)",
    );
    await expect(
      client.execute(
        "INSERT INTO sessions VALUES ('two','2026-11-25T11:00:00Z',NULL)",
      ),
    ).rejects.toThrow();
    await client.execute(
      "INSERT INTO sources(id,name,url) VALUES ('source','Test','https://example.com')",
    );
    await client.execute(
      "INSERT INTO articles(id,source_id,title,url,summary,category,ingested_at,bookmarked) VALUES ('article','source','Title','https://example.com/a','Summary','Test','2026-11-25',1)",
    );
    await client.execute(
      "INSERT INTO articles(id,source_id,title,url,summary,category,ingested_at) VALUES ('article','source','Updated','https://example.com/a','New summary','Test','2026-11-25') ON CONFLICT(url) DO UPDATE SET title=excluded.title",
    );
    const result = await client.execute(
      "SELECT title, bookmarked FROM articles",
    );
    expect(result.rows[0].title).toBe("Updated");
    expect(result.rows[0].bookmarked).toBe(1);
    await expect(
      client.execute("UPDATE settings SET weekly_hours=0"),
    ).rejects.toThrow();
  } finally {
    client.close();
  }
});
