import { readFileSync } from "node:fs";
import { client } from "../src/db";
await client.execute("PRAGMA foreign_keys = ON");
await client.execute(
  "CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);
const applied = await client.execute({
  sql: "SELECT id FROM migrations WHERE id = ?",
  args: ["0001"],
});
if (!applied.rows.length) {
  const tx = await client.transaction("write");
  try {
    const sql = readFileSync("migrations/0001_foundation.sql", "utf8");
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await tx.execute(statement);
    await tx.execute({
      sql: "INSERT INTO migrations VALUES (?, ?)",
      args: ["0001", new Date().toISOString()],
    });
    await tx.commit();
    console.log("Applied migration 0001");
  } catch (error) {
    await tx.rollback();
    throw error;
  }
} else console.log("Database is up to date");
client.close();
