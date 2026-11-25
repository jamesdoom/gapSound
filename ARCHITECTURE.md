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

The first workspace fetch returns several bounded datasets together. Separate routes and pagination should follow as usage grows. Current catalog import is per-record, not all-or-nothing. Refresh coordination is process-local; run one server. Data retention, full export and source policy checks need further work. No automatic source fetching happens during production builds.
