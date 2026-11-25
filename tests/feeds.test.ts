import { describe, expect, it } from "vitest";
import { classify, normalizeFeed } from "../src/services/feeds";
describe("feed normalization", () => {
  it("normalizes public RSS without rendering HTML", () => {
    const items = normalizeFeed(
      "<rss><channel><item><title>New CVE disclosed</title><link>https://example.com/news</link><description><![CDATA[<script>alert(1)</script><b>Research</b>]]></description><pubDate>not a date</pubDate></item></channel></rss>",
    );
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe("Vulnerability");
    expect(items[0].publishedAt).toBeNull();
    expect(items[0].summary).not.toContain("<script>");
    expect(
      normalizeFeed(
        "<rss><channel><item><title>New CVE disclosed</title><link>https://example.com/news</link></item></channel></rss>",
      )[0].id,
    ).toBe(items[0].id);
  });
  it("rejects feeds containing only unsafe links", () =>
    expect(() =>
      normalizeFeed(
        "<rss><channel><item><title>XSS</title><link>javascript:alert(1)</link></item></channel></rss>",
      ),
    ).toThrow("no usable"));
  it("rejects entity declarations", () =>
    expect(() =>
      normalizeFeed(
        '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',
      ),
    ).toThrow());
  it("bounds ingestion count", () =>
    expect(
      normalizeFeed(
        `<rss><channel>${Array.from({ length: 150 }, (_, i) => `<item><title>Test</title><link>https://example.com/a/${i}</link></item>`).join("")}</channel></rss>`,
      ),
    ).toHaveLength(100));
  it("classifies using explainable keywords", () =>
    expect(classify("Ransomware campaign")).toBe("Ransomware"));
});
