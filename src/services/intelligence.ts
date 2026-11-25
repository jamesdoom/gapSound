import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { articles } from "../db/schema";
import {
  ARTICLE_PAGE_SIZE,
  intelligenceQuery,
} from "../lib/intelligence-query";
export async function listArticles(input: unknown, database: typeof db = db) {
  const options = intelligenceQuery.parse(input);
  const filters = [];
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
  const predicate = and(...filters);
  return database.transaction(async (tx) => {
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
    return {
      items,
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
