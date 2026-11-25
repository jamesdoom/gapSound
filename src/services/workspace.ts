import { desc, eq, like, or, sql } from "drizzle-orm";
import { readTraining } from "./training";
import { listArticles } from "./intelligence";
import { listWatchlists } from "./watchlists";
import { db } from "../db";
import { publisherNotices } from "../lib/publisher-notices";
import {
  articles,
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
  browsing: {
    page?: number;
    from?: string;
    to?: string;
    watchlistId?: string;
  } = {},
) {
  const [articlePage, sourceList, kevs, checklist, study, preferences, counts] =
    await Promise.all([
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
      db
        .select()
        .from(tasks)
        .where(eq(tasks.day, day))
        .orderBy(tasks.position, tasks.id)
        .limit(100),
      readTraining(),
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
    publisherNotices,
    items: articlePage.items,
    pagination: articlePage.pagination,
    watchlists: await listWatchlists(),
    sources: sourceList,
    kevs,
    checklist,
    sessions: study.sessions,
    studyMinutes: study.studyMinutes,
    trainingDay: day,
    settings: preferences[0],
    counts: { ...counts[0], kev: kevCount.total },
  };
}
