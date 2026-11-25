import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { sessions } from "../db/schema";
export class TrainingError extends Error {}
export const stopSessionInput = z.object({
  action: z.literal("stop"),
  id: z.uuid(),
  endedAt: z.iso.datetime().optional(),
});
export async function startSession(database: typeof db = db, now = new Date()) {
  await database
    .insert(sessions)
    .values({ id: crypto.randomUUID(), startedAt: now.toISOString() })
    .onConflictDoNothing();
}
export async function stopSession(
  input: unknown,
  database: typeof db = db,
  now = new Date(),
) {
  const value = stopSessionInput.parse(input);
  if (value.endedAt && !value.id)
    throw new TrainingError("Choose the unfinished session to recover.");
  return database.transaction(async (tx) => {
    const [active] = await tx
      .select()
      .from(sessions)
      .where(isNull(sessions.endedAt))
      .limit(1);
    if (!active || (value.id && active.id !== value.id))
      throw new TrainingError(
        "This session is no longer active. Refresh and try again.",
      );
    const endedAt = value.endedAt ?? now.toISOString();
    if (
      Date.parse(endedAt) < Date.parse(active.startedAt) ||
      Date.parse(endedAt) > now.getTime()
    )
      throw new TrainingError(
        "End time must be between the session start and now.",
      );
    await tx
      .update(sessions)
      .set({ endedAt })
      .where(and(eq(sessions.id, active.id), isNull(sessions.endedAt)));
  });
}
export async function readTraining(database: typeof db = db, now = new Date()) {
  const end = now.toISOString(),
    start = new Date(now.getTime() - 7 * 86400000).toISOString();

  const history = await database
    .select()
    .from(sessions)
    .where(or(isNull(sessions.endedAt), gte(sessions.endedAt, start)))
    .orderBy(
      sql`${sessions.endedAt} is not null`,
      desc(sessions.startedAt),
      sessions.id,
    )
    .limit(1000);
  // Aggregate all completed overlaps, independently of the bounded history list.
  const [total] = await database
    .select({
      milliseconds: sql<number>`coalesce(sum(max(0,round((julianday(min(ended_at,${end}))-julianday(max(started_at,${start})))*86400000))),0)`,
    })
    .from(sessions)
    .where(
      and(gte(sessions.endedAt, start), sql`${sessions.startedAt} <= ${end}`),
    );
  return {
    sessions: history,
    studyMinutes: Math.floor(total.milliseconds / 60000),
  };
}
