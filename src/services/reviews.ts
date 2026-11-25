import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { scheduledReviews as reviews } from "../db/schema";
import { reviewAction } from "../lib/reviews";
export class ReviewError extends Error {}
export async function readReviews(page = 1, database: typeof db = db) {
  z.number().int().min(1).max(10000).parse(page);
  return database.transaction(async (tx) => {
    const [count] = await tx
      .select({ total: sql<number>`count(*)` })
      .from(reviews);
    const totalPages = Math.max(1, Math.ceil(count.total / 20));
    const currentPage = Math.min(page, totalPages);
    const items = await tx
      .select()
      .from(reviews)
      .orderBy(
        reviews.completedAt,
        reviews.dueDay,
        desc(reviews.createdAt),
        reviews.id,
      )
      .limit(20)
      .offset((currentPage - 1) * 20);
    return { items, page: currentPage, totalPages, total: count.total };
  });
}
export async function updateReview(
  input: unknown,
  database: typeof db = db,
  now = new Date(),
) {
  const value = reviewAction.parse(input);
  return database.transaction(async (tx) => {
    if (value.action === "create") {
      const [count] = await tx
        .select({ total: sql<number>`count(*)` })
        .from(reviews);
      if (count.total >= 10000)
        throw new ReviewError("Review limit reached (10,000 records).");
      const id = crypto.randomUUID();
      await tx.insert(reviews).values({
        id,
        title: value.title,
        dueDay: value.dueDay,
        createdAt: now.toISOString(),
      });
      return { id };
    }
    const changed = await tx
      .update(reviews)
      .set(
        value.action === "complete"
          ? { completedAt: now.toISOString() }
          : { dueDay: value.dueDay },
      )
      .where(and(eq(reviews.id, value.id), isNull(reviews.completedAt)))
      .returning({ id: reviews.id });
    if (!changed.length)
      throw new ReviewError(
        "Review is completed or no longer exists. Schedule a new review to retain completion history.",
      );
    return changed[0];
  });
}
