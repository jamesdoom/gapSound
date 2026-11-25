import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "../db";
import {
  articles,
  watchlists,
  watchlistTerms,
  vulnerabilities,
} from "../db/schema";
import { inArray } from "drizzle-orm";
import { extractCveMentions } from "../lib/cves";
import { WatchlistError } from "./watchlists";
import {
  ARTICLE_PAGE_SIZE,
  intelligenceQuery,
} from "../lib/intelligence-query";
export async function listArticles(input: unknown, database: typeof db = db) {
  const options = intelligenceQuery.parse(input);
  const filters: SQL[] = [];
  if (options.query)
    filters.push(
      or(
        like(articles.title, `%${options.query}%`),
        like(articles.summary, `%${options.query}%`),
      )!,
    );
  if (options.source) filters.push(eq(articles.sourceId, options.source));
  if (options.category) filters.push(eq(articles.category, options.category));
  if (options.saved) filters.push(eq(articles.bookmarked, true));
  if (options.from)
    filters.push(gte(articles.publishedAt, `${options.from}T00:00:00.000Z`));
  if (options.to)
    filters.push(lte(articles.publishedAt, `${options.to}T23:59:59.999Z`));
  return database.transaction(async (tx) => {
    let matchedTerms: string[] = [];
    if (options.watchlistId) {
      const [list] = await tx
        .select()
        .from(watchlists)
        .where(eq(watchlists.id, options.watchlistId))
        .limit(1);
      if (!list)
        throw new WatchlistError(
          "Watchlist no longer exists. Clear the filter or reload.",
        );
      matchedTerms = (
        await tx
          .select()
          .from(watchlistTerms)
          .where(eq(watchlistTerms.watchlistId, list.id))
          .limit(10)
      ).map((value) => value.term);
      filters.push(
        matchedTerms.length
          ? or(
              ...matchedTerms.map(
                (term) =>
                  sql`instr(lower(${articles.title} || ' ' || ${articles.summary}), ${term}) > 0`,
              ),
            )!
          : sql`0`,
      );
    }
    const predicate = and(...filters);
    const [count] = await tx
      .select({ total: sql<number>`count(*)` })
      .from(articles)
      .where(predicate);
    const totalPages = Math.max(
      1,
      Math.min(10000, Math.ceil(count.total / ARTICLE_PAGE_SIZE)),
    );
    const page = Math.min(options.page, totalPages);
    const items = await tx
      .select()
      .from(articles)
      .where(predicate)
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(ARTICLE_PAGE_SIZE)
      .offset((page - 1) * ARTICLE_PAGE_SIZE);
    const mentions = items.map((item) =>
      extractCveMentions(`${item.title} ${item.summary}`),
    );
    const ids = [...new Set(mentions.flat())];
    const known = new Set(
      ids.length
        ? (
            await tx
              .select({ id: vulnerabilities.id })
              .from(vulnerabilities)
              .where(inArray(vulnerabilities.id, ids))
          ).map((value) => value.id)
        : [],
    );
    return {
      items: items.map((item, index) => ({
        ...item,
        cveMentions: mentions[index].map((id) => ({
          id,
          inKev: known.has(id),
        })),
        matchedTerms: matchedTerms.filter((term) =>
          `${item.title} ${item.summary}`.toLowerCase().includes(term),
        ),
      })),
      pagination: {
        page,
        pageSize: ARTICLE_PAGE_SIZE,
        total: count.total,
        totalPages,
        from: count.total ? (page - 1) * ARTICLE_PAGE_SIZE + 1 : 0,
        to: Math.min(page * ARTICLE_PAGE_SIZE, count.total),
      },
    };
  });
}
