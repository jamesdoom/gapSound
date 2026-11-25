# Integration contracts and verification

Configured public endpoints, reviewed November 25, 2026:

| Source                     | Endpoint                                                                            | Contract                                     | Initial web verification                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| SANS Internet Storm Center | https://isc.sans.edu/rssfeed.xml                                                    | RSS items: title/link/description/pubDate    | Endpoint responded as text/xml; browsing tool cannot parse RSS                                             |
| KrebsOnSecurity            | https://krebsonsecurity.com/feed/                                                   | RSS items                                    | Endpoint responded as application/rss+xml; browsing tool cannot parse RSS                                  |
| BleepingComputer           | https://www.bleepingcomputer.com/feed/                                              | RSS items                                    | Endpoint responded as text/xml; browsing tool cannot parse RSS                                             |
| CISA KEV                   | https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json | JSON vulnerabilities array; validated fields | Catalog webpage returned 403 to browsing tool; direct contract validation recorded in HANDOFF if performed |

No credentials are configured. Treat these as public metadata integration candidates, not guaranteed service agreements. No circumvention of access restrictions is permitted. Metadata only is stored, summaries are bounded, source names and original URLs retained. Terms, automated access policy and published rate limits need deeper source-by-source review before release. The application conservatively defaults to one request/source/hour, with a minimum 15-minute attempt cooldown, no automatic immediate retries and redirect rejection. Manual refresh respects the same cooldown.

Framework references: https://nextjs.org/docs/app/getting-started/installation and https://orm.drizzle.team/docs/sqlite/get-started-sqlite. Exact installed versions are recorded in package-lock.json; review before upgrades.
