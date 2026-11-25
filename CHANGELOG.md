# Changelog

## 0.1.8 — 2026-11-25

- Added CVE identifiers found in article titles/summaries, linked to CVE Program records and explicitly labeled as unverified source mentions.
- Cross-referenced mentions against the local CISA KEV catalog in a single bounded query per page; local KEV evidence is labeled separately.
- Added persistent watchlist creation/editing/confirmed removal, literal-term filtering, matched-term explanations and page resets.
- Added migration 0004 and tests for extraction boundaries, deduplication, validation, literal matching, limits, persistence and source evidence labels.

## 0.1.7 — 2026-11-25

- Added 25-record article pagination, matching-result counts, deterministic date/ID ordering and recovery when a page becomes empty after filtering or removal.
- Added inclusive UTC publication-date filters and Clear filters; changing search/source/category/bookmark/date filters returns to page one.
- Validated date ranges and page bounds server-side; added database and browser tests covering more than 100 records, missing dates and invalid inputs.

## 0.1.6 — 2026-11-25

- Fixed a Settings remount race that discarded retention cleanup confirmation/results when initial preferences finished loading.
- Added a deterministic component regression test that fails before the fix and passes afterward.
- Updated checkout/setup-node to verified Node 24 action releases, pinned by commit; retained Node 22 for the application.
- Enabled manual workflow dispatch for explicit CI verification.
- Added seven-day CI retention of failed browser-test diagnostics using a pinned Node 24 artifact action.

## 0.1.5 — 2026-11-25

- Fixed a Tailwind class collision that hid the sidebar toggle.
- Added focus management for page changes and skip navigation, explicit collapsed-navigation names and expanded state, and a labeled study progress bar.
- Added polite success announcements, explicit keyboard focus outlines and larger operational text.
- Added automated accessibility scans for six screens at desktop and narrow-mobile widths, plus keyboard regression coverage.
- Documented review scope and remaining assistive-technology limitations in docs/ACCESSIBILITY.md.

## 0.1.4 — 2026-11-25

- Added manual Settings cleanup for unbookmarked feed metadata ingested more than 90 days ago, with a preview and explicit confirmation.
- Bounded cleanup to 400 previewed records, rechecked bookmarks/age at deletion, and expired previews after 15 minutes.
- Preserved notes, sessions, tasks, sources and KEV records; no automatic cleanup is performed.
- Added retention query index migration 0003 and database/browser regression coverage.

## 0.1.3 — 2026-11-25

- Persisted retry eligibility and consecutive failure counts, with exponential delays from 15 minutes to 24 hours and longer HTTP 429/503 Retry-After delays respected.
- Added source retry timestamps and failure counts to Command Center; manual and automatic refresh share the same policy.
- Added migration 0002, ordered migration execution, non-destructive upgrade tests and database-reopen retry tests.
- Corrected npm guidance: normal npm works in the user's terminal; the CLI workaround applies to the restricted agent environment.

## 0.1.2 — 2026-11-25

- Hardened feed transport with public-address validation for IPv4/IPv6 and DNS pinning at socket connection time. Retained TLS hostname verification, fixed URL allowlisting, no redirects, total request deadline and response bounds.
- Made per-source content upserts and successful-refresh timestamps transactional, preserving the previous catalog on write failure.
- Added destination, transport, DNS callback and database rollback regression tests.
- Verified Vercel Authentication covers all deployments and production redirects unauthenticated visitors to sign-in. Hosted storage support remains pending.

## 0.1.1 — 2026-11-25

- Added isolated Playwright coverage for article workflows, CVE research, training, notes, mobile preferences and local API security.
- Added React Testing Library loading/error coverage, configurable data directory and temporary test databases.
- Extended CI to verify browser workflows against the production build.

## 0.1.0 — 2026-11-25

- Initialized local Next.js/TypeScript/Tailwind application and GapSound identity.
- Added SQLite/Drizzle schema, transactional migration runner and persistent workspace.
- Added allowlisted RSS and CISA KEV ingestion, source health and deterministic basic briefing.
- Added article search/filter/bookmark/read workflows, KEV search, daily tasks, session tracking, research notes/exports and preferences.
- Added local request security, bounded inputs/feeds, security headers and regression tests.
- Added CI and project documentation. Phase 1 remains in progress.
