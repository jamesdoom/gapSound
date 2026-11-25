import { z } from "zod";
import { db } from "../db";
import { articles, sources, vulnerabilities } from "../db/schema";
import { eq } from "drizzle-orm";
import { fetchPublicFeed, SourceHttpError } from "../lib/feed-network";
import {
  failureSchedule,
  MIN_RETRY_MS,
  sourceCanRefresh,
} from "../lib/feed-retry";

export const feedSources = [
  {
    id: "sans",
    name: "SANS Internet Storm Center",
    url: "https://isc.sans.edu/rssfeed.xml",
  },
  {
    id: "krebs",
    name: "KrebsOnSecurity",
    url: "https://krebsonsecurity.com/feed/",
  },
  {
    id: "bleeping",
    name: "BleepingComputer",
    url: "https://www.bleepingcomputer.com/feed/",
  },
  {
    id: "cisa",
    name: "CISA KEV",
    url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
  },
] as const;
export { classify, normalizeFeed } from "./feed-normalization";
import { normalizeFeed } from "./feed-normalization";
const kevSchema = z.object({
  vulnerabilities: z
    .array(
      z.object({
        cveID: z.string().regex(/^CVE-\d{4}-\d{4,}$/),
        vendorProject: z.string().max(500),
        product: z.string().max(500),
        vulnerabilityName: z.string().max(2000),
        shortDescription: z.string().max(10000),
        requiredAction: z.string().max(10000),
        dateAdded: z.iso.date(),
        dueDate: z.iso.date(),
      }),
    )
    .max(20000),
});

async function fetchSource(url: string) {
  return fetchPublicFeed(
    url,
    feedSources.map((source) => source.url),
  );
}
let refreshing: Promise<void> | undefined;
export async function ingest(
  database: typeof db = db,
  fetcher = fetchSource,
  clock = () => new Date(),
) {
  // Sequential fetches bound concurrency to one; cooldown bounds retries, including failures.
  for (const source of feedSources) {
    await database.insert(sources).values(source).onConflictDoNothing();
    const [previous] = await database
      .select()
      .from(sources)
      .where(eq(sources.id, source.id));
    if (!sourceCanRefresh(previous, clock().getTime())) continue;
    const now = clock().toISOString();
    await database
      .update(sources)
      .set({
        lastAttempt: now,
        nextAttemptAt: new Date(Date.parse(now) + MIN_RETRY_MS).toISOString(),
      })
      .where(eq(sources.id, source.id));
    try {
      const text = await fetcher(source.url);
      await persistSource(source.id, text, clock().toISOString(), database);
    } catch (error) {
      const message =
        error instanceof Error &&
        /^Source returned HTTP \d+$/.test(error.message)
          ? error.message
          : "Refresh failed: network, format, or size error";
      const retryAfter =
        error instanceof SourceHttpError && [429, 503].includes(error.status)
          ? error.retryAfter
          : undefined;
      await database
        .update(sources)
        .set({
          error: message,
          ...failureSchedule(
            previous.consecutiveFailures,
            clock().getTime(),
            retryAfter,
          ),
        })
        .where(eq(sources.id, source.id));
    }
  }
}
export function refreshFeeds() {
  return (refreshing ??= ingest().finally(() => {
    refreshing = undefined;
  }));
}

export async function persistSource(
  sourceId: string,
  text: string,
  now: string,
  database: typeof db = db,
) {
  await database.transaction(async (tx) => {
    if (sourceId === "cisa") {
      const catalog = kevSchema.parse(JSON.parse(text));
      for (const entry of catalog.vulnerabilities) {
        const value = {
          id: entry.cveID,
          vendor: entry.vendorProject,
          product: entry.product,
          name: entry.vulnerabilityName,
          description: entry.shortDescription,
          action: entry.requiredAction,
          addedAt: entry.dateAdded,
          dueDate: entry.dueDate,
          ingestedAt: now,
        };
        await tx
          .insert(vulnerabilities)
          .values(value)
          .onConflictDoUpdate({ target: vulnerabilities.id, set: value });
      }
    } else {
      for (const article of normalizeFeed(
        text,
        feedSources.find((source) => source.id === sourceId)?.url,
      ))
        await tx
          .insert(articles)
          .values({ ...article, sourceId: sourceId, ingestedAt: now })
          .onConflictDoUpdate({
            target: articles.url,
            set: {
              sourceId,
              title: article.title,
              summary: article.summary,
              category: article.category,
              publishedAt: article.publishedAt,
            },
          });
    }
    await tx
      .update(sources)
      .set({ lastSuccess: now, error: null, consecutiveFailures: 0 })
      .where(eq(sources.id, sourceId));
  });
}
