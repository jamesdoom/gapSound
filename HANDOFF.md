# Development handoff — November 25, 2026

## Status

Phase 0 foundation and initial Phase 1 vertical slice implemented. Phase 1 is **not complete**. A Vercel deployment exists but is not supported for application use yet; authentication now protects all deployments. No paid service was added. Last completed update: DNS-pinned public feed transport and transactional source imports. GS-002 remains in progress pending full accessibility and process-restart checks; then GS-003 ingestion hardening.

## Implemented

Command Center, configured RSS ingestion and CISA KEV, article search/source/category filters/bookmarks/read state, basic KEV search, daily objectives, persistent sessions, notes with exports, settings and source health. Metrics derive from stored data. Future modules are labeled planned. The basic briefing is rule-based; archive/regeneration remains pending.

## Verification actually executed

- Installed dependencies; npm reported zero vulnerabilities across 418 audited packages.
- Migration 0001 applied successfully to local SQLite.
- TypeScript check and ESLint passed.
- Initial Vitest: 3 files, 20 tests passed. Second update: 4 files, 21 tests passed, adding component loading/error coverage.
- Production Next.js build passed.
- All four public-source direct HTTP checks returned 200: SANS XML (6,676 bytes), Krebs RSS (125,259 bytes), BleepingComputer XML (13,003 bytes), CISA JSON (1,882,385 bytes). No bypass used. Terms and future availability remain subject to review.
- Playwright with installed Chrome: 5 tests passed. Covered article search/filter/bookmark/read, CVE research, tasks/sessions, notes/export and malicious markup, mobile overflow/settings, and cross-origin/rebinding rejection. Persistence was checked across browser reloads using isolated temporary databases. No live feed requests.
- Current update: 58 tests across 6 Vitest files passed; lint, explicit typecheck, production build and all 5 Chrome browser tests passed.
- Isolated live ingestion through the new transport succeeded: 35 articles, 1,796 KEV records, all four sources successful. User data was not changed.
- Verified Vercel protection configuration is all deployments; an unauthenticated production request returned HTTP 302 to Vercel sign-in. No Vercel settings were changed.
- Full visual/accessibility review and process-restart persistence tests remain pending.

## Decisions and remaining risks

Next.js/React, Tailwind and local SQLite through Drizzle/libSQL; no native compiler setup or hosted database. Exact local Host/Origin checks require port 3000. Input, network and query limits implemented. No arbitrary URL retrieval or raw HTML rendering. DNS pinning/public-IP validation and atomic per-source imports are now implemented. Retry-After/backoff, retention, source policy review, secret scanning and expanded end-to-end coverage remain outstanding. Markdown is displayed as plain text. Results are bounded at 100 per content view without pagination. See TASKS.md and SECURITY.md.

## Run instructions and environment

The default npm shim references a missing roaming installation. Use the bundled npm without changing system settings:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" ci
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run db:migrate
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

Open http://127.0.0.1:3000. Use the same prefix with `run typecheck`, `run lint`, `test` or `run build`. No server is intentionally left running at session end. Restricted-shell Git can report ownership mismatch because clone ran as desktop user; use authorized Git execution as that user, not global safe.directory changes.

## Next steps and learning

Complete GS-002 accessibility/process-restart coverage and GS-003 Retry-After/backoff, retention and source-policy review, then continue the Phase 1 backlog. Question: why does loopback binding alone fail to prevent cross-origin requests to a local application?
