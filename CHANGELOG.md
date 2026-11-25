# Changelog

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
