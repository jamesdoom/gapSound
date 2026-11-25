# Changelog

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
