import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import * as schema from "../src/db/schema";
import { persistSource } from "../src/services/feeds";
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
it("rolls back a partially written catalog and preserves last successful refresh", async () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  try {
    await client.executeMultiple(
      readFileSync("migrations/0001_foundation.sql", "utf8"),
    );
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
    await client.executeMultiple(
      readFileSync("migrations/0001_foundation.sql", "utf8"),
    );
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
