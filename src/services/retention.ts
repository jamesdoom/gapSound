import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { articles } from "../db/schema";
export const RETENTION_DAYS = 90;
export const RETENTION_BATCH_SIZE = 400;
const PREVIEW_VALID_MS = 15 * 60000;
export const cleanupInput = z.object({
  action: z.literal("cleanup"),
  confirmed: z.literal(true),
  cutoff: z.iso.datetime(),
  ids: z.array(z.string().min(1).max(64)).min(1).max(RETENTION_BATCH_SIZE),
});
function cutoffAt(now: Date) {
  return new Date(now.getTime() - RETENTION_DAYS * 86400000).toISOString();
}
function eligible(cutoff: string) {
  return and(eq(articles.bookmarked, false), lt(articles.ingestedAt, cutoff));
}
export async function previewRetention(
  database: typeof db = db,
  now = new Date(),
) {
  const cutoff = cutoffAt(now);
  return database.transaction(async (tx) => {
    const [count] = await tx
      .select({ total: sql<number>`count(*)` })
      .from(articles)
      .where(eligible(cutoff));
    const batch = await tx
      .select({ id: articles.id })
      .from(articles)
      .where(eligible(cutoff))
      .orderBy(asc(articles.ingestedAt), asc(articles.id))
      .limit(RETENTION_BATCH_SIZE);
    return {
      cutoff,
      eligibleCount: count.total,
      ids: batch.map((item) => item.id),
      retentionDays: RETENTION_DAYS,
    };
  });
}
export type RetentionPreview = Awaited<ReturnType<typeof previewRetention>>;
export class ExpiredRetentionPreview extends Error {}
export async function cleanupRetention(
  input: unknown,
  database: typeof db = db,
  now = new Date(),
) {
  const plan = cleanupInput.parse(input);
  const cutoff = Date.parse(plan.cutoff),
    currentCutoff = Date.parse(cutoffAt(now));
  if (cutoff > currentCutoff || cutoff < currentCutoff - PREVIEW_VALID_MS)
    throw new ExpiredRetentionPreview(
      "Preview expired. Preview cleanup again.",
    );
  const deleted = await database
    .delete(articles)
    .where(
      and(eligible(plan.cutoff), inArray(articles.id, [...new Set(plan.ids)])),
    )
    .returning({ id: articles.id });
  return { deletedCount: deleted.length };
}
