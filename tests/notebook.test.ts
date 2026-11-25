import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import { saveNote, listNotes, exportNotes } from "../src/services/notebook";
async function fixture() {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  return { client, db: drizzle(client, { schema }) };
}
it("edits notes transactionally, normalizes tags and rejects stale writes without replacing content", async () => {
  const { client, db } = await fixture();
  try {
    const note = await saveNote(
      {
        action: "note",
        title: "Original",
        body: "    Evidence\n",
        tags: " CSRF, csrf, Browser ",
      },
      db,
      new Date("2026-11-25T12:00:00Z"),
    );
    const first = (await listNotes({}, db)).items[0];
    expect(first.tags).toBe("csrf, browser");
    expect(first.body).toBe("    Evidence\n");
    expect((await listNotes({ tag: "csrf" }, db)).total).toBe(1);
    expect((await listNotes({ tag: "cs" }, db)).total).toBe(0);
    await saveNote(
      {
        action: "note",
        id: note.id,
        revision: 0,
        title: "Edited",
        body: "**Verified**",
        tags: "forensics",
      },
      db,
      new Date("2026-11-26T12:00:00Z"),
    );
    await expect(
      saveNote(
        {
          action: "note",
          id: note.id,
          revision: 0,
          title: "Stale",
          body: "Lost update",
          tags: "stale",
        },
        db,
      ),
    ).rejects.toThrow("changed in another view");
    const edited = (await listNotes({}, db)).items[0];
    expect(edited.createdAt).toBe(first.createdAt);
    expect(edited.revision).toBe(1);
    expect(edited.body).toBe("**Verified**");
    expect((await listNotes({ tag: "csrf" }, db)).total).toBe(0);
    expect((await listNotes({}, db)).tags).toEqual([
      { tag: "forensics", count: 1 },
    ]);
    for (const change of [
      { tags: "x".repeat(41) },
      { body: "" },
      { id: note.id, revision: undefined },
      { title: "x".repeat(201) },
    ])
      await expect(
        saveNote(
          { action: "note", title: "Valid", body: "Body", tags: "", ...change },
          db,
        ),
      ).rejects.toThrow();
  } finally {
    client.close();
  }
});
it("paginates and exports beyond 100 notes with stable tie ordering, filters and literal search", async () => {
  const { client, db } = await fixture();
  try {
    for (let i = 0; i < 103; i++)
      await saveNote(
        {
          action: "note",
          title: "Paging " + String(i).padStart(3, "0"),
          body: i === 0 ? "100%_literal" : "Body",
          tags: i % 2 ? "odd" : "even",
        },
        db,
        new Date("2026-11-25T12:00:00Z"),
      );
    const ids = new Set<string>();
    for (let page = 1; page <= 6; page++) {
      const result = await listNotes({ page }, db);
      expect(result.total).toBe(103);
      for (const note of result.items) ids.add(note.id);
    }
    expect(ids.size).toBe(103);
    expect((await listNotes({ query: "%_" }, db)).total).toBe(1);
    let cursor: Awaited<ReturnType<typeof exportNotes>>["next"] = null;
    const exported: string[] = [];
    do {
      const result = await exportNotes(
        {},
        cursor ?? undefined,
        db,
        new Date("2026-11-26T00:00:00Z"),
      );
      exported.push(...result.items.map((n) => n.id));
      cursor = result.next;
    } while (cursor);
    expect(new Set(exported)).toEqual(ids);
    expect(exported).toHaveLength(103);
    const batch = await exportNotes(
      { tag: "odd" },
      undefined,
      db,
      new Date("2026-11-26T00:00:00Z"),
    );
    expect(batch.items.every((n) => n.tags === "odd")).toBe(true);
    expect((await listNotes({ tag: "odd" }, db)).total).toBe(51);
    await expect(exportNotes({}, { cutoff: "bad" }, db)).rejects.toThrow();
  } finally {
    client.close();
  }
});
it("backfills legacy tags without changing original note text or timestamps", async () => {
  const { readFileSync } = await import("node:fs");
  const client = createClient({ url: ":memory:" });
  try {
    await client.executeMultiple(
      readFileSync("migrations/0001_foundation.sql", "utf8"),
    );
    await client.execute(
      "INSERT INTO notes(id,title,body,tags,created_at) VALUES ('legacy','Original','<script>literal</script>',' CSRF, Browser,csrf ','2026-11-25T12:00:00Z')",
    );
    await client.execute(
      "CREATE TABLE migrations(id TEXT PRIMARY KEY,applied_at TEXT NOT NULL)",
    );
    await client.execute("INSERT INTO migrations VALUES ('0001','before')");
    await migrateDatabase(client);
    const db = drizzle(client, { schema });
    const result = await listNotes({ tag: "csrf" }, db);
    expect(result.total).toBe(1);
    expect(result.items[0].body).toBe("<script>literal</script>");
    expect(result.items[0].tags).toBe(" CSRF, Browser,csrf ");
    expect(result.items[0].revision).toBe(0);
  } finally {
    client.close();
  }
});

it("rolls back a note edit if updating its tag index fails", async () => {
  const { client, db } = await fixture();
  try {
    const note = await saveNote(
      { action: "note", title: "Original", body: "Preserve", tags: "original" },
      db,
    );
    await client.execute(
      "CREATE TRIGGER fail_tags BEFORE INSERT ON note_tags BEGIN SELECT RAISE(ABORT,'simulated failure'); END",
    );
    await expect(
      saveNote(
        {
          action: "note",
          id: note.id,
          revision: 0,
          title: "Changed",
          body: "Changed",
          tags: "changed",
        },
        db,
      ),
    ).rejects.toThrow();
    const saved = (await listNotes({}, db)).items[0];
    expect(saved.body).toBe("Preserve");
    expect(saved.revision).toBe(0);
    expect((await listNotes({ tag: "original" }, db)).total).toBe(1);
  } finally {
    client.close();
  }
});
