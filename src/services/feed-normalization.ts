import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { decodeHTML } from "entities";
import { z } from "zod";
import { safeUrl } from "../lib/security";
export const MAX_FEED_BYTES = 10 * 1024 * 1024;
const MAX_ITEMS = 100;
type Node = Record<string, unknown>;
function record(value: unknown): value is Node {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function values(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (record(value))
    return typeof value["#text"] === "string" ? value["#text"] : "";
  return "";
}
export function feedText(value: unknown, max: number): string {
  let result = text(value);
  // XML escaping may wrap HTML entities/markup. No custom XML entities run.
  for (let i = 0; i < 2; i++) result = decodeHTML(result);
  return result
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
export function publicationTime(value: unknown): string | null {
  const input = text(value).trim();
  if (!input) return null;
  if (z.iso.datetime({ offset: true }).safeParse(input).success) {
    const date = new Date(input);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  const match =
    /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2}|\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(GMT|UT|UTC|Z|EST|EDT|CST|CDT|MST|MDT|PST|PDT|[+-]\d{4})$/i.exec(
      input,
    );
  if (!match) return null;
  const [, day, month, rawYear, hour, minute, second = "00", rawZone] = match;
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const year =
    rawYear.length === 2
      ? String(Number(rawYear) + (Number(rawYear) < 50 ? 2000 : 1900))
      : rawYear;
  const zones: Record<string, string> = {
    GMT: "Z",
    UT: "Z",
    UTC: "Z",
    Z: "Z",
    EST: "-05:00",
    EDT: "-04:00",
    CST: "-06:00",
    CDT: "-05:00",
    MST: "-07:00",
    MDT: "-06:00",
    PST: "-08:00",
    PDT: "-07:00",
  };
  const zone =
    zones[rawZone.toUpperCase()] ??
    `${rawZone.slice(0, 3)}:${rawZone.slice(3)}`;
  const iso = `${year}-${String(months.indexOf(month.toLowerCase()) + 1).padStart(2, "0")}-${day.padStart(2, "0")}T${hour}:${minute}:${second}${zone}`;
  if (!z.iso.datetime({ offset: true }).safeParse(iso).success) return null;
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
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
function articleUrl(value: unknown, sourceUrl?: string): string | null {
  let candidate = decodeHTML(text(value)).trim();
  if (!candidate) return null;
  // Resolve only root/path-relative references against the configured source.
  if (!/^[a-z][a-z\d+.-]*:/i.test(candidate)) {
    if (!sourceUrl) return null;
    try {
      candidate = new URL(candidate, sourceUrl).href;
    } catch {
      return null;
    }
  }
  return safeUrl(candidate);
}
export function normalizeFeed(xml: string, sourceUrl?: string) {
  if (Buffer.byteLength(xml, "utf8") > MAX_FEED_BYTES)
    throw new Error("Feed exceeds size limit");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error("Invalid or unsafe XML");
  const parsed: unknown = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: false,
    maxNestedTags: 32,
  }).parse(xml);
  if (!record(parsed)) throw new Error("Unsupported feed format");
  let entries: unknown[];
  let atom = false;
  let channel: Node;
  if (record(parsed.rss) && record(parsed.rss.channel)) {
    channel = parsed.rss.channel;
    entries = values(channel.item);
  } else if (record(parsed.feed)) {
    atom = true;
    channel = parsed.feed;
    entries = values(parsed.feed.entry);
  } else if (record(parsed.RDF)) {
    channel = record(parsed.RDF.channel) ? parsed.RDF.channel : {};
    entries = values(parsed.RDF.item);
  } else throw new Error("Unsupported feed format");
  function notices(...nodes: Node[]) {
    const parts: string[] = [];
    for (const node of nodes)
      for (const field of ["copyright", "rights", "license"]) {
        const supplied = values(node[field]);
        if (supplied.length > 20) throw new Error("Too many publisher notices");
        for (const value of supplied) {
          if (
            typeof value !== "string" &&
            (!record(value) || typeof value["#text"] !== "string")
          )
            throw new Error("Unsupported structured publisher notice");
          const notice = feedText(value, 5001);
          if (notice && !parts.includes(notice)) parts.push(notice);
        }
      }
    const joined = parts.join("\n");
    if (joined.length > 5000)
      throw new Error("Publisher notice exceeds size limit");
    return joined || null;
  }
  const seen = new Set<string>();
  const result = [];
  for (const entry of entries.slice(0, MAX_ITEMS)) {
    if (!record(entry)) continue;
    let link: unknown = values(entry.link).find(
      (value) => typeof value === "string",
    );
    if (atom) {
      const links = values(entry.link)
        .filter(record)
        .filter((value) => !value["@_rel"] || value["@_rel"] === "alternate");
      link = (links.find(
        (value) => !value["@_type"] || value["@_type"] === "text/html",
      ) ?? links[0])?.["@_href"];
    }
    // RSS GUID fallback is allowed only when explicitly a permalink.
    if (!link && record(entry.guid) && entry.guid["@_isPermaLink"] === "true")
      link = entry.guid;
    const url = articleUrl(link, sourceUrl);
    const title = feedText(entry.title, 500);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const summary = feedText(atom ? entry.summary : entry.description, 1500);
    result.push({
      id: createHash("sha256").update(url).digest("hex"),
      title,
      url,
      summary,
      publisherNotice: notices(channel, entry),
      category: classify(`${title} ${summary}`),
      publishedAt: publicationTime(
        atom ? entry.published : (entry.pubDate ?? entry.date),
      ),
    });
  }
  if (entries.length && !result.length)
    throw new Error("Feed contains no usable article metadata");
  return result;
}
