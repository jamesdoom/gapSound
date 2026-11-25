import { test, expect } from "vitest";
import { createClient } from "@libsql/client";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { backupDatabase, restoreDatabase } from "../src/db/backup";
import { migrateDatabase } from "../src/db/migrate";

test("live WAL backup restores committed data without copying journal files or overwriting workspaces", async () => {
  const root = await mkdtemp(join(tmpdir(), "gapsound-backup-"));
  const source = join(root, "gapsound.db");
  const client = createClient({ url: pathToFileURL(source).href });
  try {
    await migrateDatabase(client);
    await client.execute("PRAGMA journal_mode=WAL");
    await client.execute(
      "INSERT INTO notes (id,title,body,tags,created_at) VALUES ('backup-note','Private study','Preserve this text','evidence','2026-11-25T00:00:00.000Z')",
    );
    const bundle = join(root, "bundle");
    await backupDatabase(source, bundle);
    await client.execute(
      "UPDATE notes SET body='Later edit' WHERE id='backup-note'",
    );
    const restored = join(root, "restored");
    await restoreDatabase(bundle, restored);
    const copy = createClient({
      url: pathToFileURL(join(restored, "gapsound.db")).href,
    });
    try {
      expect((await copy.execute("SELECT body FROM notes")).rows[0].body).toBe(
        "Preserve this text",
      );
    } finally {
      copy.close();
    }
    await expect(restoreDatabase(bundle, restored)).rejects.toThrow();
    await expect(backupDatabase(source, bundle)).rejects.toThrow();
    expect((await client.execute("SELECT body FROM notes")).rows[0].body).toBe(
      "Later edit",
    );
    const manifest = JSON.parse(
      await readFile(join(bundle, "manifest.json"), "utf8"),
    );
    manifest.sha256 = "0".repeat(64);
    await writeFile(join(bundle, "manifest.json"), JSON.stringify(manifest));
    await expect(
      restoreDatabase(bundle, join(root, "tampered")),
    ).rejects.toThrow("checksum mismatch");
  } finally {
    client.close();
  }
});

test("backup rejects databases without GapSound migration history", async () => {
  const root = await mkdtemp(join(tmpdir(), "gapsound-invalid-backup-"));
  const source = join(root, "empty.db");
  const client = createClient({ url: pathToFileURL(source).href });
  await client.execute("CREATE TABLE unrelated (id TEXT)");
  client.close();
  await expect(backupDatabase(source, join(root, "bundle"))).rejects.toThrow();
});

test("backup rejects orphaned foreign keys and restore rejects malformed manifests", async () => {
  const root = await mkdtemp(join(tmpdir(), "gapsound-invalid-relations-"));
  const source = join(root, "gapsound.db");
  const client = createClient({ url: pathToFileURL(source).href });
  try {
    await migrateDatabase(client);
    await client.execute("PRAGMA foreign_keys=OFF");
    await client.execute(
      "INSERT INTO note_tags (note_id,tag) VALUES ('missing-note','orphan')",
    );
    await expect(
      backupDatabase(source, join(root, "nested", "invalid")),
    ).rejects.toThrow("foreign key");
    await writeFile(join(root, "manifest.json"), '{"format":999}');
    await expect(
      restoreDatabase(root, join(root, "restored")),
    ).rejects.toThrow();
  } finally {
    client.close();
  }
});
