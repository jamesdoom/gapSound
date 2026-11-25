import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import { db } from "../db";
import { articles, sources, vulnerabilities } from "../db/schema";
import { eq } from "drizzle-orm";
import { plainText, safeUrl } from "../lib/security";
import { fetchPublicFeed } from "../lib/feed-network";

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
export function classify(text: string) {
  for (const [pattern, category] of [
    [/ransomware/i, "Ransomware"],
    [/phish/i, "Phishing"],
    [/malware/i, "Malware"],
    [/breach/i, "Data breach"],
    [/\bCVE\b|CVE-|vulnerab/i, "Vulnerability"],
    [/\bAI\b|LLM/i, "AI security"],
  ] as const)
    if (pattern.test(text)) return category;
  return "Threat intelligence";
}
export function normalizeFeed(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error("Invalid or unsafe XML");
  const parsed = new XMLParser({
    ignoreAttributes: true,
    processEntities: false,
  }).parse(xml);
  const raw = parsed?.rss?.channel?.item ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.slice(0, 100).flatMap((item: Record<string, unknown>) => {
    const url = typeof item.link === "string" ? safeUrl(item.link) : null;
    const title =
      typeof item.title === "string" ? plainText(item.title).slice(0, 500) : "";
    if (!url || !title) return [];
    const summary =
      typeof item.description === "string"
        ? plainText(item.description).slice(0, 1500)
        : "";
    const date =
      typeof item.pubDate === "string" ? new Date(item.pubDate) : null;
    return [
      {
        id: createHash("sha256").update(url).digest("hex"),
        title,
        url,
        summary,
        category: classify(`${title} ${summary}`),
        publishedAt: date && !isNaN(date.getTime()) ? date.toISOString() : null,
      },
    ];
  });
}
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
async function ingest() {
  // Sequential fetches bound concurrency to one; cooldown bounds retries, including failures.
  for (const source of feedSources) {
    await db.insert(sources).values(source).onConflictDoNothing();
    const [previous] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, source.id));
    if (
      previous.lastAttempt &&
      Date.now() - Date.parse(previous.lastAttempt) < 15 * 60 * 1000
    )
      continue;
    const now = new Date().toISOString();
    await db
      .update(sources)
      .set({ lastAttempt: now })
      .where(eq(sources.id, source.id));
    try {
      const text = await fetchSource(source.url);
      await persistSource(source.id, text, now);
    } catch (error) {
      const message =
        error instanceof Error &&
        /^Source returned HTTP \d+$/.test(error.message)
          ? error.message
          : "Refresh failed: network, format, or size error";
      await db
        .update(sources)
        .set({ error: message })
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
      for (const article of normalizeFeed(text))
        await tx
          .insert(articles)
          .values({ ...article, sourceId: sourceId, ingestedAt: now })
          .onConflictDoUpdate({
            target: articles.url,
            set: {
              title: article.title,
              summary: article.summary,
              category: article.category,
              publishedAt: article.publishedAt,
            },
          });
    }
    await tx
      .update(sources)
      .set({ lastSuccess: now, error: null })
      .where(eq(sources.id, sourceId));
  });
}
