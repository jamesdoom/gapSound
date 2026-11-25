import { expect, it } from "vitest";
import { extractCveMentions } from "../src/lib/cves";
it("extracts normalized deduplicated metadata mentions without inventing IDs", () => {
  expect(
    extractCveMentions("CVE-2026-12345, cve-2026-12345 and (CVE-1999-0001)."),
  ).toEqual(["CVE-2026-12345", "CVE-1999-0001"]);
  expect(
    extractCveMentions(
      "prefixCVE-2026-12345 CVE-2026-123 CVE-26-12345 CVE-2026-12345suffix CVE-2026-12345-evil",
    ),
  ).toEqual([]);
  expect(
    extractCveMentions(
      "CVE-2026-1234567890123456789 CVE-2026-12345678901234567890",
    ),
  ).toEqual(["CVE-2026-1234567890123456789"]);
});
it("bounds the number of links generated from external metadata", () => {
  expect(
    extractCveMentions(
      Array.from({ length: 30 }, (_, i) => `CVE-2026-${1000 + i}`).join(" "),
    ),
  ).toHaveLength(20);
});
