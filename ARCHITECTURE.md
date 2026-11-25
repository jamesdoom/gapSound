# Architecture

## Boundaries and data flow

Browser React workspace → same-origin JSON route → Zod input boundary → service/repository queries → Drizzle → local SQLite. Refresh action → fixed source allowlist → bounded fetch → XML/JSON validation → normalized metadata upserts. Query strings never form SQL; Drizzle parameterizes values. External articles are never executed or rendered as HTML.

- `src/app`: Next.js shell, headers and JSON API.
- `src/components/dashboard.tsx`: initial client workspace, navigation and forms. Extract module components as workflows grow.
- `src/lib`: central brand and security utilities.
- `src/services`: ingestion and read repository.
- `src/db`: typed relational schema and local connection.
- `migrations`: versioned SQL; `scripts/migrate.ts` applies transactional migrations once.
- `tests`: deterministic trust-boundary, normalization and SQLite constraint tests.
- `docs`: authoritative specification and integration research.

## Data design

Sources own articles by foreign key; article URLs are unique and hashes stable. Upserts preserve read/bookmark state. KEV records use authoritative CVE IDs. Daily tasks use local calendar date; event timestamps use UTC ISO strings. A partial unique index enforces at most one active session. Settings validate ranges in both API and database. Queries cap results (100 per content view, 1000 sessions). Separate migrations table records applied versions.

## Decisions

- Modular monolith, single-user, local-only. No public deployment or authentication yet.
- libSQL local SQLite driver avoids native compiler setup on Windows. Drizzle keeps persistence typed; migrations deliberately remain plain reviewed SQL.
- Initial feed category assignment uses explicit keywords, not unsupported AI claims. No fabricated CVSS/EPSS data.
- Ingestion concurrency is one with in-process refresh deduplication and per-source persistent 15-minute attempt cooldown. Browser interval is configurable. No unbounded retry loop.
- Tailwind pipeline is available; centralized CSS tokens define the initial design. Heavy table/chart/UI packages are deferred until justified.
- AI architecture is reserved for Phase 2; no paid requests or unused provider abstractions are introduced now.

## Known tradeoffs

The first workspace fetch returns several bounded datasets together. Separate routes and pagination should follow as usage grows. Each source import now commits its content and successful-refresh timestamp in one transaction. Refresh coordination is process-local; run one server. Data retention, full export and source policy checks need further work. No automatic source fetching happens during production builds.

Outbound feed requests use native HTTPS with a custom socket lookup. Every resolved address must be public; the socket receives a validated address without a second DNS lookup. New connections do not reuse pooled sockets. TLS verifies the configured hostname. No redirects or compressed responses are accepted; a total 15-second deadline covers DNS, TLS and response streaming. This transport intentionally does not use an outbound proxy or the framework fetch cache.

## Persistent source retry scheduling

Migration 0002 adds source failure counts and retry-eligible timestamps without rewriting content. The migration runner applies ordered versioned SQL once per database. Each failure increments an exponential delay from 15 minutes to a 24-hour local cap; a valid longer Retry-After on HTTP 429/503 takes precedence. Both manual and automatic refresh check persisted eligibility. Successful imports reset failure counts atomically with source metadata; no sleeping request or retry worker is created. Browser regression tests use an isolated database and port 3100 so local development on port 3000 can continue.

## Manual metadata retention

Settings uses a dedicated same-origin POST endpoint for preview and confirmed cleanup. A fixed 90-day ingestion-age rule protects recently imported metadata regardless of source publication time. Each request removes at most 400 previewed IDs, rechecking current bookmark state and cutoff; preview cutoffs expire after 15 minutes. Migration 0003 adds a composite index for eligibility queries. No automatic cleanup or SQLite VACUUM is run, and personal records and KEV catalog records are excluded. The preview is not an authorization token; exact local Host/Origin validation remains the access boundary.

## Article browsing

The workspace delegates article queries to src/services/intelligence.ts. A shared Zod query schema validates dates and page bounds; SQL remains parameterized. Matching counts and 25-row pages are read together in a transaction. Results use descending publication date and ID, with unknown dates last when unfiltered. Inclusive UTC bounds are applied to publication time only. Pages beyond the remaining result set clamp to its last page. Pagination affects article browsing only; CVE/notes retain their current 100-row bounds. Offset paging is capped at 10,000 pages; large datasets and concurrent ingestion would benefit from keyset pagination later.

## CVE mentions and watchlists

Article pages derive CVE mentions from bounded stored metadata; no full-content scrape or external lookup runs. Mentions are normalized/deduplicated and cross-checked against the local KEV table with one bounded query for the page. The UI labels source mentions and local KEV evidence separately. These derived references need no backfill or extra article table.

Migration 0004 adds watchlists and child terms with referential integrity and uniqueness. Services save edits atomically and bound list/term counts. Watchlist queries add literal instr conditions to existing filters and pagination, and return matched terms for explanation. The matching rule is OR across terms, AND with other filters; SQLite case folding is ASCII. No regex engine, notifications or background task is created. Removing a list removes only its terms, not articles.
