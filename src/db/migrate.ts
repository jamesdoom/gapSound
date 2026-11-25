import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Client } from "@libsql/client";
export async function migrateDatabase(
  client: Client,
  directory = "migrations",
) {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute(
    "CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const appliedNow: string[] = [];
  for (const filename of readdirSync(directory)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort()) {
    const id = filename.slice(0, 4);
    const applied = await client.execute({
      sql: "SELECT id FROM migrations WHERE id = ?",
      args: [id],
    });
    if (applied.rows.length) continue;
    const tx = await client.transaction("write");
    try {
      // Let SQLite parse SQL literals/comments, including semicolons in notices.
      await tx.executeMultiple(readFileSync(join(directory, filename), "utf8"));
      await tx.execute({
        sql: "INSERT INTO migrations VALUES (?,?)",
        args: [id, new Date().toISOString()],
      });
      await tx.commit();
      appliedNow.push(id);
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
  return appliedNow;
}
