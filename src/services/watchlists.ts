import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { watchlists, watchlistTerms } from "../db/schema";
import { deleteWatchlistInput, saveWatchlistInput } from "../lib/watchlists";
export class WatchlistError extends Error {}
export async function listWatchlists(database: typeof db = db) {
  const rows = await database
    .select({
      id: watchlists.id,
      name: watchlists.name,
      term: watchlistTerms.term,
    })
    .from(watchlists)
    .leftJoin(watchlistTerms, eq(watchlists.id, watchlistTerms.watchlistId))
    .orderBy(asc(watchlists.name), asc(watchlistTerms.term))
    .limit(500);
  const groups = new Map<
    string,
    { id: string; name: string; terms: string[] }
  >();
  for (const row of rows) {
    const group = groups.get(row.id) ?? {
      id: row.id,
      name: row.name,
      terms: [],
    };
    if (row.term) group.terms.push(row.term);
    groups.set(row.id, group);
  }
  return [...groups.values()];
}
export async function saveWatchlist(input: unknown, database: typeof db = db) {
  const value = saveWatchlistInput.parse(input);
  return database.transaction(async (tx) => {
    const [duplicate] = await tx
      .select()
      .from(watchlists)
      .where(sql`lower(${watchlists.name}) = lower(${value.name})`)
      .limit(1);
    if (duplicate && duplicate.id !== value.id)
      throw new WatchlistError("A watchlist with this name already exists.");
    const id = value.id ?? crypto.randomUUID();
    if (value.id) {
      const updated = await tx
        .update(watchlists)
        .set({ name: value.name })
        .where(eq(watchlists.id, id))
        .returning({ id: watchlists.id });
      if (!updated.length)
        throw new WatchlistError(
          "Watchlist no longer exists. Reload and try again.",
        );
      await tx.delete(watchlistTerms).where(eq(watchlistTerms.watchlistId, id));
    } else {
      const [count] = await tx
        .select({ total: sql<number>`count(*)` })
        .from(watchlists);
      if (count.total >= 50)
        throw new WatchlistError("The workspace supports up to 50 watchlists.");
      await tx
        .insert(watchlists)
        .values({ id, name: value.name, createdAt: new Date().toISOString() });
    }
    await tx
      .insert(watchlistTerms)
      .values(value.terms.map((term) => ({ watchlistId: id, term })));
    return { id };
  });
}
export async function deleteWatchlist(
  input: unknown,
  database: typeof db = db,
) {
  const value = deleteWatchlistInput.parse(input);
  await database.transaction(async (tx) => {
    // Delete children explicitly as well as declaring FK cascade.
    await tx
      .delete(watchlistTerms)
      .where(eq(watchlistTerms.watchlistId, value.id));
    await tx.delete(watchlists).where(eq(watchlists.id, value.id));
  });
}
