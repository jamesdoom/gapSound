import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import {
  addDailyObjective,
  readObjectivePlan,
  updateObjectivePlan,
} from "../src/services/objectives";
import { generateBriefing, readBriefings } from "../src/services/briefings";
const now = new Date("2026-11-25T16:00:00Z");
const apply = {
  action: "apply",
  revision: 1,
  day: "2026-11-25",
  timeZone: "America/New_York",
};
async function fixture() {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  return { client, db: drizzle(client, { schema }) };
}
it("saves an ordered plan, appends once per day, preserves history and freezes briefing contents", async () => {
  const { client, db } = await fixture();
  try {
    expect(await readObjectivePlan(db)).toEqual({ revision: 0, titles: [] });
    expect(await db.select().from(schema.tasks)).toHaveLength(0);
    await addDailyObjective("Previous day", "2026-11-24", db);
    await addDailyObjective("One-off", "2026-11-25", db);
    await updateObjectivePlan(
      { action: "save", revision: 0, titles: [" Review DNS ", "Study TLS"] },
      db,
      now,
    );
    await updateObjectivePlan(apply, db, now);
    const today = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.day, apply.day))
      .orderBy(schema.tasks.position, schema.tasks.id);
    expect(today.map((t) => t.title)).toEqual([
      "One-off",
      "Review DNS",
      "Study TLS",
    ]);
    await db
      .update(schema.tasks)
      .set({ done: true })
      .where(eq(schema.tasks.id, today[1].id));
    const briefing = await generateBriefing(
      { action: "generate", day: apply.day, timeZone: apply.timeZone },
      db,
      now,
    );
    const snapshot = (await readBriefings(apply.day, 1, briefing.id, db)).view!
      .snapshot;
    expect(snapshot.objectives.map((t) => t.title)).toEqual(
      today.map((t) => t.title),
    );
    await updateObjectivePlan(
      {
        action: "save",
        revision: 1,
        titles: ["Study TLS edited", "Review DNS"],
      },
      db,
      now,
    );
    await expect(
      updateObjectivePlan({ ...apply, revision: 2 }, db, now),
    ).rejects.toThrow("already been applied");
    expect(
      (
        await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.id, today[1].id))
      )[0].done,
    ).toBe(true);
    expect(
      (await readBriefings(apply.day, 1, briefing.id, db)).view!.snapshot,
    ).toEqual(snapshot);
    await updateObjectivePlan(
      { ...apply, revision: 2, day: "2026-11-26" },
      db,
      new Date("2026-11-26T16:00:00Z"),
    );
    expect(
      (
        await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.day, "2026-11-26"))
          .orderBy(schema.tasks.position)
      ).map((t) => t.title),
    ).toEqual(["Study TLS edited", "Review DNS"]);
    expect(
      await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.day, "2026-11-24")),
    ).toHaveLength(1);
    await updateObjectivePlan(
      { action: "save", revision: 2, titles: [] },
      db,
      now,
    );
    expect(await db.select().from(schema.tasks)).toHaveLength(6);
  } finally {
    client.close();
  }
});
it("rejects stale saves, duplicate/oversized/blank titles, wrong dates/zones and empty application", async () => {
  const { client, db } = await fixture();
  try {
    await expect(
      updateObjectivePlan({ ...apply, revision: 0 }, db, now),
    ).rejects.toThrow("at least one");
    for (const titles of [
      [" "],
      ["A", "a"],
      ["x".repeat(201)],
      Array(21).fill("x"),
    ])
      await expect(
        updateObjectivePlan({ action: "save", revision: 0, titles }, db, now),
      ).rejects.toThrow();
    await updateObjectivePlan(
      { action: "save", revision: 0, titles: ["Safe <script>text</script>"] },
      db,
      now,
    );
    await expect(
      updateObjectivePlan(
        { action: "save", revision: 0, titles: ["Stale"] },
        db,
        now,
      ),
    ).rejects.toThrow("another tab");
    await expect(
      updateObjectivePlan({ ...apply, day: "2026-11-24" }, db, now),
    ).rejects.toThrow("day changed");
    await expect(
      updateObjectivePlan({ ...apply, timeZone: "Not/AZone" }, db, now),
    ).rejects.toThrow("time zone");
    expect(await readObjectivePlan(db)).toEqual({
      revision: 1,
      titles: ["Safe <script>text</script>"],
    });
    expect(await db.select().from(schema.tasks)).toHaveLength(0);
  } finally {
    client.close();
  }
});
it("rolls back the daily application marker on insert failure and enforces the shared daily limit", async () => {
  const { client, db } = await fixture();
  try {
    await updateObjectivePlan(
      { action: "save", revision: 0, titles: ["First", "Second"] },
      db,
      now,
    );
    await client.execute(
      "CREATE TRIGGER reject_tasks BEFORE INSERT ON tasks BEGIN SELECT RAISE(ABORT,'fixture failure'); END",
    );
    await expect(updateObjectivePlan(apply, db, now)).rejects.toThrow();
    expect(await db.select().from(schema.objectivePlanDays)).toHaveLength(0);
    await client.execute("DROP TRIGGER reject_tasks");
    await db.insert(schema.tasks).values(
      Array.from({ length: 99 }, (_, i) => ({
        id: crypto.randomUUID(),
        day: apply.day,
        title: "Existing " + i,
        position: i,
      })),
    );
    await expect(updateObjectivePlan(apply, db, now)).rejects.toThrow(
      "at most 100",
    );
    expect(await db.select().from(schema.objectivePlanDays)).toHaveLength(0);
    await addDailyObjective("Last", apply.day, db);
    await expect(
      addDailyObjective("Hidden overflow", apply.day, db),
    ).rejects.toThrow("at most 100");
    expect(await db.select().from(schema.tasks)).toHaveLength(100);
  } finally {
    client.close();
  }
});
