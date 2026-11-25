# Development handoff — November 25, 2026

## Status

Phase 0 foundation and initial Phase 1 vertical slice implemented. Phase 1 is **not complete**. No public deployment or paid service configured. Last completed task: GS-001 initial persisted workspace. Next: GS-002 browser/component regression coverage, then GS-003 ingestion hardening.

## Implemented

Command Center, configured RSS ingestion and CISA KEV, article search/source/category filters/bookmarks/read state, basic KEV search, daily objectives, persistent sessions, notes with exports, settings and source health. Metrics derive from stored data. Future modules are labeled planned. The basic briefing is rule-based; archive/regeneration remains pending.

## Verification actually executed

- Installed dependencies; npm reported zero vulnerabilities across 418 audited packages.
- Migration 0001 applied successfully to local SQLite.
- TypeScript check and ESLint passed.
- Vitest: 3 files, 20 tests passed (security, normalization, database integration).
- Production Next.js build passed.
- All four public-source direct HTTP checks returned 200: SANS XML (6,676 bytes), Krebs RSS (125,259 bytes), BleepingComputer XML (13,003 bytes), CISA JSON (1,882,385 bytes). No bypass used. Terms and future availability remain subject to review.
- Browser workflow and visual review not yet performed.

## Decisions and remaining risks

Next.js/React, Tailwind and local SQLite through Drizzle/libSQL; no native compiler setup or hosted database. Exact local Host/Origin checks require port 3000. Input, network and query limits implemented. No arbitrary URL retrieval or raw HTML rendering. DNS pinning/private-IP resolution checks, atomic catalog import, rate-limit backoff, retention, secret scanning and full end-to-end coverage remain outstanding. Markdown is displayed as plain text. Results are bounded at 100 per content view without pagination. See TASKS.md and SECURITY.md.

## Run instructions and environment

The default npm shim references a missing roaming installation. Use the bundled npm without changing system settings:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" ci
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run db:migrate
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

Open http://127.0.0.1:3000. Use the same prefix with `run typecheck`, `run lint`, `test` or `run build`. No server is intentionally left running at session end. Restricted-shell Git can report ownership mismatch because clone ran as desktop user; use authorized Git execution as that user, not global safe.directory changes.

## Next steps and learning

Add browser tests with isolated fixtures, verify critical workflows and restart persistence, review accessibility/mobile layout, then finish the Phase 1 backlog. Question: why does loopback binding alone fail to prevent cross-origin requests to a local application?
