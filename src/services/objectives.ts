import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { calendarDay } from "../lib/briefings";
import { objectivePlan, objectivePlanDays, tasks } from "../db/schema";

export class ObjectiveError extends Error {}
const titlesSchema = z
  .array(z.string().trim().min(1).max(200))
  .max(20)
  .refine(
    (titles) =>
      new Set(titles.map((t) => t.toLowerCase())).size === titles.length,
  );
export const objectiveAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    titles: titlesSchema.refine(
      (titles) => JSON.stringify(titles).length <= 10000,
    ),
  }),
  z.object({
    action: z.literal("apply"),
    revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    day: z.iso.date(),
    timeZone: z.string().min(1).max(100),
  }),
]);
export async function readObjectivePlan(
  database: Pick<typeof db, "select"> = db,
) {
  const [plan] = await database
    .select()
    .from(objectivePlan)
    .where(eq(objectivePlan.id, "local"));
  if (!plan) throw new Error("Missing objective plan");
  return {
    revision: plan.revision,
    titles: titlesSchema.parse(JSON.parse(plan.titles)),
  };
}
export async function updateObjectivePlan(
  input: unknown,
  database: typeof db = db,
  now = new Date(),
) {
  const value = objectiveAction.parse(input);
  if (value.action === "apply") {
    let today: string;
    try {
      today = calendarDay(now, value.timeZone);
    } catch {
      throw new ObjectiveError("Choose a valid local time zone.");
    }
    if (value.day !== today)
      throw new ObjectiveError(
        "The day changed. Refresh before applying the plan.",
      );
  }
  return database.transaction(async (tx) => {
    const plan = await readObjectivePlan(tx);
    if (plan.revision !== value.revision)
      throw new ObjectiveError(
        "The plan changed in another tab. Reload the saved plan before trying again.",
      );
    if (value.action === "save") {
      const updated = await tx
        .update(objectivePlan)
        .set({
          titles: JSON.stringify(value.titles),
          revision: plan.revision + 1,
        })
        .where(
          and(
            eq(objectivePlan.id, "local"),
            eq(objectivePlan.revision, value.revision),
          ),
        )
        .returning({ id: objectivePlan.id });
      if (!updated.length)
        throw new ObjectiveError("The plan changed. Reload and try again.");
      return { revision: plan.revision + 1, titles: value.titles };
    }
    if (!plan.titles.length)
      throw new ObjectiveError(
        "Save at least one objective before applying the plan.",
      );
    if (
      (
        await tx
          .select()
          .from(objectivePlanDays)
          .where(eq(objectivePlanDays.day, value.day))
      ).length
    )
      throw new ObjectiveError(
        "A saved plan has already been applied to this day. Existing objectives are preserved.",
      );
    const [count] = await tx
      .select({
        total: sql<number>`count(*)`,
        last: sql<number>`coalesce(max(position),-1)`,
      })
      .from(tasks)
      .where(eq(tasks.day, value.day));
    if (count.total + plan.titles.length > 100)
      throw new ObjectiveError(
        "A daily checklist can contain at most 100 objectives.",
      );
    await tx.insert(objectivePlanDays).values({
      day: value.day,
      revision: plan.revision,
      appliedAt: now.toISOString(),
    });
    await tx.insert(tasks).values(
      plan.titles.map((title, index) => ({
        id: crypto.randomUUID(),
        day: value.day,
        title,
        position: count.last + index + 1,
      })),
    );
    return { applied: plan.titles.length };
  });
}
export async function addDailyObjective(
  title: string,
  day: string,
  database: typeof db = db,
) {
  const value = z
    .object({ title: z.string().trim().min(1).max(200), day: z.iso.date() })
    .parse({ title, day });
  return database.transaction(async (tx) => {
    const [count] = await tx
      .select({
        total: sql<number>`count(*)`,
        last: sql<number>`coalesce(max(position),-1)`,
      })
      .from(tasks)
      .where(eq(tasks.day, value.day));
    if (count.total >= 100)
      throw new ObjectiveError(
        "A daily checklist can contain at most 100 objectives.",
      );
    await tx
      .insert(tasks)
      .values({ id: crypto.randomUUID(), ...value, position: count.last + 1 });
  });
}
