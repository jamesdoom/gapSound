import { and, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  scheduledReviews,
  articles,
  dailyBriefings,
  settings,
  sources,
  tasks,
  vulnerabilities,
  watchlistTerms,
} from "../db/schema";
import {
  briefingSnapshot,
  calendarDay,
  generateBriefingInput,
} from "../lib/briefings";
import { safeUrl } from "../lib/security";
import { feedMinimumMs } from "../lib/source-policy";
import { feedSources } from "./feeds";
export class BriefingError extends Error {}
export async function generateBriefing(
  input: unknown,
  database: typeof db = db,
  now = new Date(),
) {
  const options = generateBriefingInput.parse(input);
  let today;
  try {
    today = calendarDay(now, options.timeZone);
  } catch {
    throw new BriefingError("Invalid time zone.");
  }
  if (options.day !== today)
    throw new BriefingError("Generate a briefing for the current local day.");
  const timestamp = now.toISOString(),
    windowStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  return database.transaction(async (tx) => {
    const candidates = await tx
      .select({ article: articles, source: sources.name })
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(
        and(
          gte(articles.publishedAt, windowStart),
          lte(articles.publishedAt, timestamp),
        ),
      )
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(200);
    const terms = (
      await tx
        .select()
        .from(watchlistTerms)
        .orderBy(watchlistTerms.term, watchlistTerms.watchlistId)
        .limit(500)
    ).map((value) => value.term);
    const news = candidates
      .filter((item) => safeUrl(item.article.url))
      .map(({ article, source }, index) => {
        const text = `${article.title} ${article.summary}`.replace(
          /[A-Z]/g,
          (char) => char.toLowerCase(),
        );
        const matchedTerms = [
          ...new Set(terms.filter((term) => text.includes(term))),
        ].slice(0, 5);
        return {
          title: article.title,
          url: article.url,
          source,
          publishedAt: article.publishedAt,
          summary: article.summary.slice(0, 240),
          matchedTerms,
          saved: article.bookmarked,
          score: matchedTerms.length * 10 + (article.bookmarked ? 5 : 0),
          index,
        };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 3)
      .map((item) => ({
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        summary: item.summary,
        matchedTerms: item.matchedTerms,
        saved: item.saved,
      }));
    const kevs = await tx
      .select({
        id: vulnerabilities.id,
        name: vulnerabilities.name,
        addedAt: vulnerabilities.addedAt,
        action: vulnerabilities.action,
      })
      .from(vulnerabilities)
      .where(
        and(
          gte(vulnerabilities.addedAt, windowStart.slice(0, 10)),
          lte(vulnerabilities.addedAt, timestamp.slice(0, 10)),
        ),
      )
      .orderBy(desc(vulnerabilities.addedAt), desc(vulnerabilities.id))
      .limit(3);
    const sourceRows = await tx.select().from(sources);
    const [preferences] = await tx
      .select()
      .from(settings)
      .where(eq(settings.id, "local"));
    const freshnessMs = (preferences?.refreshMinutes ?? 60) * 120000;
    const sourceHealth = feedSources.map((source) => {
      const row = sourceRows.find((value) => value.id === source.id);
      const success = Date.parse(row?.lastSuccess ?? "");
      const age = now.getTime() - success;
      const status = row?.error
        ? "error"
        : !Number.isFinite(success)
          ? "missing"
          : age < 0 || age > Math.max(freshnessMs, feedMinimumMs(source.id) * 2)
            ? "stale"
            : "fresh";
      return {
        name: source.name,
        status,
        lastSuccess: Number.isFinite(success) ? row!.lastSuccess : null,
      };
    });
    const objectives = await tx
      .select({ title: tasks.title, done: tasks.done })
      .from(tasks)
      .where(eq(tasks.day, options.day))
      .orderBy(tasks.position, tasks.id)
      .limit(100);
    const reviewPrompts = await tx
      .select({ title: tasks.title, day: tasks.day })
      .from(tasks)
      .where(
        and(
          eq(tasks.done, true),
          lt(tasks.day, options.day),
          gte(tasks.day, windowStart.slice(0, 10)),
        ),
      )
      .orderBy(desc(tasks.day), desc(tasks.id))
      .limit(3);
    const dueCondition = and(
      isNull(scheduledReviews.completedAt),
      lte(scheduledReviews.dueDay, options.day),
    );
    const dueReviews = await tx
      .select({
        id: scheduledReviews.id,
        title: scheduledReviews.title,
        dueDay: scheduledReviews.dueDay,
      })
      .from(scheduledReviews)
      .where(dueCondition)
      .orderBy(scheduledReviews.dueDay, scheduledReviews.id)
      .limit(100);
    const [dueCount] = await tx
      .select({ total: sql<number>`count(*)` })
      .from(scheduledReviews)
      .where(dueCondition);
    const snapshot = briefingSnapshot.parse({
      version: 2,
      dueReviews,
      dueReviewCount: dueCount.total,
      day: options.day,
      timeZone: options.timeZone,
      generatedAt: timestamp,
      windowStart,
      news,
      kevs,
      sources: sourceHealth,
      objectives,
      reviewPrompts,
      learning: {
        topic: "Distinguish severity from exploitation evidence",
        url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        question:
          "Does a high CVSS score prove that a vulnerability is being exploited?",
        answer:
          "No. Severity and evidence of exploitation are different. Check authoritative exploitation evidence, affected versions and your own exposure; a local KEV match does not prove your system is compromised.",
      },
    });
    const id = crypto.randomUUID();
    await tx
      .update(dailyBriefings)
      .set({ archivedAt: timestamp })
      .where(
        and(
          eq(dailyBriefings.day, options.day),
          isNull(dailyBriefings.archivedAt),
        ),
      );
    await tx.insert(dailyBriefings).values({
      id,
      day: options.day,
      createdAt: timestamp,
      snapshot: JSON.stringify(snapshot),
    });
    return { id };
  });
}
export async function archiveBriefing(
  id: string,
  database: typeof db = db,
  now = new Date(),
) {
  await database
    .update(dailyBriefings)
    .set({ archivedAt: now.toISOString() })
    .where(and(eq(dailyBriefings.id, id), isNull(dailyBriefings.archivedAt)));
}
export async function readBriefings(
  day: string,
  page = 1,
  id?: string,
  database: typeof db = db,
) {
  return database.transaction(async (tx) => {
    const [active] = await tx
      .select()
      .from(dailyBriefings)
      .where(
        and(eq(dailyBriefings.day, day), isNull(dailyBriefings.archivedAt)),
      )
      .limit(1);
    const [selected] = id
      ? await tx
          .select()
          .from(dailyBriefings)
          .where(eq(dailyBriefings.id, id))
          .limit(1)
      : [];
    const [count] = await tx
      .select({ total: sql<number>`count(*)` })
      .from(dailyBriefings);
    const totalPages = Math.max(
        1,
        Math.min(10000, Math.ceil(count.total / 10)),
      ),
      currentPage = Math.min(page, totalPages);
    const history = await tx
      .select({
        id: dailyBriefings.id,
        day: dailyBriefings.day,
        createdAt: dailyBriefings.createdAt,
        archivedAt: dailyBriefings.archivedAt,
      })
      .from(dailyBriefings)
      .orderBy(desc(dailyBriefings.createdAt), desc(dailyBriefings.id))
      .limit(10)
      .offset((currentPage - 1) * 10);
    const value = id ? selected : active;
    if (id && !selected) throw new BriefingError("Briefing no longer exists.");
    return {
      currentId: active?.id ?? null,
      view: value
        ? {
            id: value.id,
            day: value.day,
            createdAt: value.createdAt,
            archivedAt: value.archivedAt,
            snapshot: briefingSnapshot.parse(JSON.parse(value.snapshot)),
          }
        : null,
      history,
      pagination: { page: currentPage, totalPages, total: count.total },
    };
  });
}
