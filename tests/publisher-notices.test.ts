import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { publisherNotices } from "../src/lib/publisher-notices";
import { migrateDatabase } from "../src/db/migrate";
import { backupDatabase, restoreDatabase } from "../src/db/backup";
import * as schema from "../src/db/schema";
import { persistSource } from "../src/services/feeds";
import { generateBriefing, readBriefings } from "../src/services/briefings";

const now = new Date("2026-11-25T16:00:00Z");
it("retains the complete reviewed CVE and CISA license texts", () => {
  const hash = (id: string) =>
    createHash("sha256")
      .update(publisherNotices.items.find((item) => item.id === id)!.text)
      .digest("hex");
  expect(hash("cve")).toBe(
    "bb006467c4cc4346e9d6da5b45717eb0726e5d5f8466c56b9eba9adc1f7181e5",
  );
  expect(hash("cisa")).toBe(
    "8dfcf2d0cba33bede386eb470daf2ac08caf6540fc2516baab10dd546f90938a",
  );
  expect(
    publisherNotices.items.find((item) => item.id === "cve")!.attribution,
  ).toContain("Copyright © 1999-2026, The MITRE Corporation.");
});
const rss = (notice: string, itemNotice = "") =>
  `<rss><channel><copyright>${notice}</copyright><item><title>Legal metadata demonstration</title><link>https://example.com/notices</link><pubDate>Wed, 25 Nov 2026 15:00:00 GMT</pubDate><description>Synthetic text.</description>${itemNotice}</item></channel></rss>`;
it("stores the complete reviewed bundle, snapshots feed notices and preserves existing snapshots on later refresh", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await migrateDatabase(client);
    const database = drizzle(client, { schema });
    expect(
      JSON.parse(
        String(
          (
            await client.execute(
              "SELECT document FROM dataset_notices WHERE id='publisher'",
            )
          ).rows[0].document,
        ),
      ),
    ).toEqual(publisherNotices);
    await database.insert(schema.sources).values({
      id: "sans",
      name: "SANS Internet Storm Center",
      url: "https://isc.sans.edu/rssfeed.xml",
    });
    await persistSource(
      "sans",
      rss(
        "© Example publisher; all rights retained.",
        "<copyright>Item-specific notice.</copyright>",
      ),
      now.toISOString(),
      database,
    );
    const first = (await database.select().from(schema.articles))[0];
    expect(first.publisherNotice).toBe(
      "© Example publisher; all rights retained.\nItem-specific notice.",
    );
    await database
      .update(schema.articles)
      .set({ bookmarked: true, read: true });
    const briefing = await generateBriefing(
      { action: "generate", day: "2026-11-25", timeZone: "America/New_York" },
      database,
      now,
    );
    const before = (await readBriefings("2026-11-25", 1, briefing.id, database))
      .view!.snapshot;
    expect(before.publisherNotices).toEqual(publisherNotices);
    expect(before.news[0].publisherNotice).toBe(first.publisherNotice);
    await persistSource("sans", rss(""), now.toISOString(), database);
    expect((await database.select().from(schema.articles))[0]).toMatchObject({
      publisherNotice: first.publisherNotice,
      bookmarked: true,
      read: true,
    });
    await persistSource(
      "sans",
      rss("Updated notice"),
      now.toISOString(),
      database,
    );
    expect(
      (await readBriefings("2026-11-25", 1, briefing.id, database)).view!
        .snapshot,
    ).toEqual(before);
  } finally {
    client.close();
  }
});

it("copies and verifies notice sidecars during restore and supports old bundles without rewriting snapshots", async () => {
  const root = await mkdtemp(join(tmpdir(), "gapsound-notices-"));
  const source = join(root, "original.db");
  const client = createClient({ url: pathToFileURL(source).href });
  try {
    await migrateDatabase(client);
    await backupDatabase(source, join(root, "bundle"));
    const notices = await readFile(
      join(root, "bundle", "publisher-notices.json"),
      "utf8",
    );
    expect(JSON.parse(notices)).toEqual(publisherNotices);
    await restoreDatabase(join(root, "bundle"), join(root, "restored"));
    expect(
      await readFile(join(root, "restored", "publisher-notices.json"), "utf8"),
    ).toBe(notices);
    const restored = createClient({
      url: pathToFileURL(join(root, "restored", "gapsound.db")).href,
    });
    try {
      expect(
        JSON.parse(
          String(
            (
              await restored.execute(
                "SELECT document FROM dataset_notices WHERE id='publisher'",
              )
            ).rows[0].document,
          ),
        ),
      ).toEqual(publisherNotices);
    } finally {
      restored.close();
    }
    await writeFile(join(root, "bundle", "publisher-notices.json"), "{}");
    await expect(
      restoreDatabase(join(root, "bundle"), join(root, "tampered")),
    ).rejects.toThrow("notice checksum");
    const manifest = JSON.parse(
      await readFile(join(root, "bundle", "manifest.json"), "utf8"),
    );
    delete manifest.publisherNoticesSha256;
    await writeFile(
      join(root, "bundle", "manifest.json"),
      JSON.stringify(manifest),
    );
    await restoreDatabase(join(root, "bundle"), join(root, "legacy-manifest"));
  } finally {
    client.close();
  }
});

it("rolls back an entire SQL migration on failure, including SQL with semicolons in literals", async () => {
  const root = await mkdtemp(join(tmpdir(), "gapsound-notice-migration-"));
  await writeFile(
    join(root, "0001_fixture.sql"),
    "CREATE TABLE fixture (notice TEXT); INSERT INTO fixture VALUES ('Publisher; retained'); INSERT INTO missing_table VALUES ('fail');",
  );
  const client = createClient({ url: ":memory:" });
  try {
    await expect(migrateDatabase(client, root)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE name='fixture'",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (await client.execute("SELECT * FROM migrations")).rows,
    ).toHaveLength(0);
    await writeFile(
      join(root, "0001_fixture.sql"),
      "CREATE TABLE fixture (notice TEXT); INSERT INTO fixture VALUES ('Publisher; retained');",
    );
    await migrateDatabase(client, root);
    expect(
      (await client.execute("SELECT notice FROM fixture")).rows[0].notice,
    ).toBe("Publisher; retained");
  } finally {
    client.close();
  }
});
