import { desc, eq, gte, like, or, sql } from "drizzle-orm";
import { listArticles } from "./intelligence";
import { db } from "../db";
import {
  articles,
  notes,
  sessions,
  settings,
  sources,
  tasks,
  vulnerabilities,
} from "../db/schema";
export async function workspace(
  query: string,
  source: string,
  category: string,
  saved: boolean,
  day: string,
  browsing: { page?: number; from?: string; to?: string } = {},
) {
  const [
    articlePage,
    sourceList,
    kevs,
    checklist,
    study,
    research,
    preferences,
    counts,
  ] = await Promise.all([
    listArticles({ query, source, category, saved, ...browsing }),
    db.select().from(sources),
    db
      .select()
      .from(vulnerabilities)
      .where(
        query
          ? or(
              like(vulnerabilities.id, `%${query}%`),
              like(vulnerabilities.product, `%${query}%`),
              like(vulnerabilities.vendor, `%${query}%`),
            )
          : undefined,
      )
      .orderBy(desc(vulnerabilities.addedAt))
      .limit(100),
    db.select().from(tasks).where(eq(tasks.day, day)).limit(100),
    db
      .select()
      .from(sessions)
      .where(
        gte(
          sessions.startedAt,
          new Date(Date.now() - 7 * 86400000).toISOString(),
        ),
      )
      .orderBy(desc(sessions.startedAt))
      .limit(1000),
    db
      .select()
      .from(notes)
      .where(
        query
          ? or(
              like(notes.title, `%${query}%`),
              like(notes.body, `%${query}%`),
              like(notes.tags, `%${query}%`),
            )
          : undefined,
      )
      .orderBy(desc(notes.createdAt))
      .limit(100),
    db.select().from(settings).where(eq(settings.id, "local")),
    db
      .select({
        total: sql<number>`count(*)`,
        bookmarks: sql<number>`coalesce(sum(${articles.bookmarked}),0)`,
      })
      .from(articles),
  ]);
  const [kevCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(vulnerabilities);
  return {
    items: articlePage.items,
    pagination: articlePage.pagination,
    sources: sourceList,
    kevs,
    checklist,
    sessions: study,
    notes: research,
    settings: preferences[0],
    counts: { ...counts[0], kev: kevCount.total },
  };
}
