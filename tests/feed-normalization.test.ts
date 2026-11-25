import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  feedText,
  MAX_FEED_BYTES,
  normalizeFeed,
  publicationTime,
} from "../src/services/feed-normalization";
const fixture = (name: string) =>
  readFileSync(`tests/fixtures/feeds/${name}.xml`, "utf8");
describe("verified source metadata shapes", () => {
  it("preserves numeric titles and unknown summaries from SANS-style RSS", () => {
    const [item] = normalizeFeed(fixture("sans"));
    expect(item.title).toBe("123");
    expect(item.summary).toBe("");
    expect(item.url).toBe("https://example.com/isc/123?a=1&b=2");
    expect(item.publishedAt).toBe("2026-11-25T02:00:03.000Z");
  });
  it("decodes WordPress metadata without retaining script text or full article content", () => {
    const [item] = normalizeFeed(fixture("krebs"));
    expect(item.title).toBe("Research & defense — demonstration");
    expect(item.summary).toBe("Reader’s summary & mitigation.");
    expect(item.summary).not.toContain("CVE");
    expect(item.summary).not.toContain("COMPLETE");
  });
  it("resolves relative links and deduplicates while dropping individual unsafe entries", () => {
    const items = normalizeFeed(
      fixture("bleeping"),
      "https://example.com/feed/",
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      url: "https://example.com/news/demo",
      title: 'Patch "now": CVE-2099-11111',
      summary: "A & B guidance",
      publishedAt: "2026-11-25T16:13:40.000Z",
    });
  });
  it("supports namespaced Atom alternate links and never substitutes updated for published", () => {
    const items = normalizeFeed(fixture("atom"));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Defense & research",
      url: "https://example.com/atom/demo",
      summary: "Short summary",
      publishedAt: "2026-11-25T15:00:00.000Z",
    });
    expect(items[1].publishedAt).toBeNull();
    expect(items[1].summary).toBe("");
  });
  it("supports RDF publication metadata and explicit permalink GUID fallback", () => {
    expect(normalizeFeed(fixture("rdf"))[0].publishedAt).toBe(
      "2026-11-25T15:00:00.000Z",
    );
    expect(
      normalizeFeed(
        '<rss><channel><item><title>Demo</title><guid isPermaLink="true">https://example.com/guid</guid></item></channel></rss>',
      )[0].url,
    ).toBe("https://example.com/guid");
  });
});
describe("untrusted metadata boundaries", () => {
  it.each([
    "<html><body>Access denied</body></html>",
    "<rss/>",
    "<rss><channel><item><title>Missing link</title></item></channel></rss>",
  ])("rejects unsupported or unusable feeds", (xml) =>
    expect(() => normalizeFeed(xml)).toThrow(),
  );
  it("accepts a recognized empty feed, bounds fields and rejects excess depth/bytes", () => {
    expect(
      normalizeFeed("<rss><channel><title>Demo</title></channel></rss>"),
    ).toEqual([]);
    expect(feedText("x".repeat(2000), 500)).toHaveLength(500);
    expect(() => normalizeFeed(" ".repeat(MAX_FEED_BYTES + 1))).toThrow("size");
    expect(() =>
      normalizeFeed(
        "<rss><channel>" +
          "<item>".repeat(40) +
          "</item>".repeat(40) +
          "</channel></rss>",
      ),
    ).toThrow();
  });
  it.each([
    "2026-11-25T10:00:00",
    "2026-02-30T10:00:00Z",
    "Mon, 30 Feb 2026 10:00:00 GMT",
    "2026-11-25",
    "not a date",
  ])("leaves invalid or ambiguous publication date unknown: %s", (value) =>
    expect(publicationTime(value)).toBeNull(),
  );
  it("converts RFC timezone offsets and rejects document entities", () => {
    expect(publicationTime("25 Nov 2026 11:00 EST")).toBe(
      "2026-11-25T16:00:00.000Z",
    );
    expect(() =>
      normalizeFeed(
        '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///secret">]><rss/>',
      ),
    ).toThrow();
  });
});
