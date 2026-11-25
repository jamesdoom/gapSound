# Integration contracts and verification

**Current policy review (November 25, 2026):** see [Publisher review register](SOURCE_POLICIES.md). SANS has a server-enforced 60-minute floor; other RSS/KEV sources keep a 15-minute app floor, with longer Retry-After/backoff honored. Local reader use is distinct from redistribution permission. Krebs reuse and CVE notice/license packaging remain explicit release gates; GS-003 is not fully closed.

## Historical contract and transport checks

Configured public endpoints, reviewed November 25, 2026:

| Source                     | Endpoint                                                                            | Contract                                     | Initial web verification                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| SANS Internet Storm Center | https://isc.sans.edu/rssfeed.xml                                                    | RSS items: title/link/description/pubDate    | Endpoint responded as text/xml; browsing tool cannot parse RSS                                             |
| KrebsOnSecurity            | https://krebsonsecurity.com/feed/                                                   | RSS items                                    | Endpoint responded as application/rss+xml; browsing tool cannot parse RSS                                  |
| BleepingComputer           | https://www.bleepingcomputer.com/feed/                                              | RSS items                                    | Endpoint responded as text/xml; browsing tool cannot parse RSS                                             |
| CISA KEV                   | https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json | JSON vulnerabilities array; validated fields | Catalog webpage returned 403 to browsing tool; direct contract validation recorded in HANDOFF if performed |

No credentials are configured. Treat these as public metadata integration candidates, not guaranteed service agreements. No circumvention of access restrictions is permitted. Metadata only is stored, summaries are bounded, source names and original URLs retained. Terms, automated access policy and published rate limits need deeper source-by-source review before release. The application conservatively defaults to one request/source/hour, with a minimum 15-minute attempt cooldown, no automatic immediate retries and redirect rejection. Manual refresh respects the same cooldown.

Framework references: https://nextjs.org/docs/app/getting-started/installation and https://orm.drizzle.team/docs/sqlite/get-started-sqlite. Exact installed versions are recorded in package-lock.json; review before upgrades.

Direct Node HTTP verification during this session returned HTTP 200 for all four configured endpoints. CISA returned application/json and all three news sources returned XML/RSS. The application-level full live ingest and source terms review remain pending; endpoint availability alone does not establish permission for all usage.

Hardened transport smoke test (November 25, 2026): all four configured sources ingested successfully into an isolated temporary database, producing 35 articles and 1,796 KEV entries. Public DNS address validation and socket pinning were enabled. This test does not replace source terms/policy review.

HTTP 429/503 now preserve Retry-After and persist the next eligible fetch time. Repeated failures use exponential backoff up to a local 24-hour cap; longer provider deadlines win. HTTP-date and decimal-seconds formats follow RFC 9110 section 10.2.3: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after . Automatic refresh intervals may delay the actual retry beyond eligibility. No immediate retries occur.

Normalization verification (November 25, 2026): hardened read-only requests returned source shapes matching the synthetic fixtures. The completed normalizer accepted 10 SANS entries (4 summaries), 10 Krebs entries (10 summaries), and 15 BleepingComputer entries (15 summaries), with all 35 publication timestamps valid. No database writes were performed. WordPress full-content fields were intentionally ignored. See FEED_NORMALIZATION.md; source terms/rate-policy review remains open.

CVE research (November 25, 2026): the official CVE Services public GET /cve/{id} contract, CVE 5.x format and CNA/ADP containers were reviewed. The app constructs only https://cveawg.mitre.org/api/cve/{validated-ID}. A bounded read-only production-transport request for CVE-2021-44228 parsed successfully without database writes. Manual lookups use a 24-hour cache, 15-minute per-ID attempt cooldown, global lease and persisted failure/Retry-After backoff; there is no automatic CVE polling. These are application limits, not asserted provider quotas. Full terms/rate-policy release review remains open; see CVE_RESEARCH.md.
