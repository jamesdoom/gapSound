# Development handoff — November 25, 2026

## Status

Phase 1 remains in progress. Latest completed update: publisher policy review, source-specific refresh floors and visible policy guidance. GS-006 vulnerability research remains implemented. Notebook editing/tags/export/Markdown (partial GS-007) remains implemented. Training session recovery and day rollover remain implemented. GS-004 intelligence discovery and GS-005 persistent deterministic briefings are complete. Scheduled due reviews are also implemented. Remaining work includes configurable objectives (GS-007), remaining publisher reuse/notice release gates (GS-003), broader full application restart/manual assistive coverage (GS-002) and release acceptance (GS-008). No Phase 2 work is authorized.

The app remains local-first, single-user and bound to 127.0.0.1:3000. The existing protected Vercel deployment remains unsupported for application use until storage/access architecture is adapted. No hosting settings, paid services, AI providers or authentication changed. Git pushes may trigger the user's existing protected build integration.

## Latest behavior

The requested publisher terms/rate review is recorded in docs/SOURCE_POLICIES.md, with primary links, review date, robots observations, scope limits and unresolved items. Settings → Publisher policies shows source guidance and attribution. No publisher outreach or public/commercial use was authorized.

SANS static-feed guidance recommends hourly downloads. Its scope is not an express diary-RSS prose license; the application conservatively applies a 60-minute floor to the existing SANS RSS endpoint. Other configured feeds retain a 15-minute application floor. Krebs robots requests 35 seconds; BleepingComputer's generic group requests one second. These hints are distinct from a copyright license or API quota. No numeric CISA KEV or single-record CVE API quota was verified, and the separate Search API beta quota was not applied here.

Server eligibility now checks the source floor against lastAttempt even for older rows whose nextAttemptAt was created with the former 15-minute default. New attempts persist the matching floor. Failure backoff starts at that floor and doubles up to 24 hours, with longer Retry-After taking precedence. Manual refresh and browser preferences cannot bypass this check. Saved briefing freshness now uses twice the larger of the preference and source floor; existing snapshots remain unchanged.

The review found an explicit CC0 license for KEV in CISA's official repository. BleepingComputer has publisher-provided RSS and personal/non-commercial storage provisions, alongside redistribution restrictions. Krebs advertises its RSS feed, but broader reuse permission was not found. CVE usage terms have MITRE copyright/license reproduction conditions. The review is complete, but **GS-003 is not fully closed**: broader Krebs reuse, exact CVE notice/license packaging and required notices/rights before distributing publisher-derived content remain release gates. Do not describe the app as cleared for public reuse. See the register for evidence and remaining actions.

No schema migration, dependency change, feed ingestion or personal-data deletion was required. Existing articles, bookmarks and archived briefings were preserved. Public robots files and Krebs RSS-discovery HTML were read using bounded, identified HTTPS requests; CISA webpage 403s were not bypassed, and CISA's official repository supplied licensing evidence instead. Historical transport/ingest observations remain in docs/INTEGRATIONS.md.

CVE research (migration 0008), notebook workflows (0007), scheduled reviews and training recovery/day rollover remain implemented. Configurable training objectives remain pending. No Phase 2 implementation or hosting/security setting changed.

## Verification actually executed

- 151 automated tests across 24 Vitest files passed.
- Type checking, lint without warnings and production build passed. Git whitespace check passed before commit.
- All 28 Chrome browser tests passed against the final build on isolated loopback port 3100, including Settings policy assertions and desktop/mobile accessibility/overflow checks.
- New tests verify source-floor eligibility for legacy rows, exact hourly boundaries, failure backoff and longer Retry-After, end-to-end SANS ingestion attempts at 15-minute/one-hour intervals, and briefing freshness with 15-minute preferences.
- Settings browser assertions verify the policy section, SANS primary-source link and hourly floor; desktop/mobile axe and overflow coverage remains in the suite.
- No live publisher services are contacted by routine tests. Review-only HTTPS reads returned 200 robots files for SANS/Krebs/BleepingComputer, a 404 for the CVE API host's robots, and publisher-advertised RSS discovery on the Krebs homepage. No article content was ingested into the user's database during this review.

Prior hosted CI repair was verified at https://github.com/jamesdoom/gapSound/actions/runs/45652241919 with no annotations. Current update checks ran locally; no new hosted CI result is claimed. Dependency versions were unchanged; the prior notebook dependency audit reported zero vulnerabilities.

## Persistent briefing/review behavior

New version-2 briefings capture up to 100 unfinished due/overdue reviews plus their total count. Changes appear only after regeneration; older version-1 snapshots remain readable and explicitly say scheduled reviews were not captured. Regeneration/archive/history retain prior contents. Completed review records cannot be rescheduled; create a new record for another attempt. No automatic spaced repetition or notifications. See docs/DAILY_BRIEFINGS.md.

## Remaining limitations and next actions

- Complete configurable training objectives; the requested notebook workflows are implemented.
- Resolve the specific publisher reuse/notice gates in docs/SOURCE_POLICIES.md before claiming GS-003 complete or distributing publisher data.
- Complete full application restart coverage for remaining workflows; prior training backend restart verification did not launch/restart the entire Next.js server.
- Complete backup/restore verification, secret scanning and final dependency/security review.
- Manual screen-reader, zoom and forced-colors checks remain; axe passing is not WCAG certification.
- CVE and notebook reads are paginated. Feed refresh lacks a cross-process lock/retry jitter; CVE lookups use persisted leases/cooldowns but no background queue.
- Private study text may appear in retained briefing snapshots and backups. No encryption at rest, undo or secure erasure is provided. Recovery of already completed sessions is not supported.

## Run and verify

Restart the dev server to load this update:

    npm run dev

No new migration is needed for this update (0008 remains current). Open http://127.0.0.1:3000 → Settings → Publisher policies. A shorter automatic interval still cannot force an hourly SANS request early. General checks:

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run test:e2e

Browser tests use a new temporary database on port 3100 and can run alongside the user's development server on 3000. Install Playwright Chromium or set PLAYWRIGHT_CHANNEL=chrome. Normal npm works in the user's VS Code terminal; only the restricted agent shell needs the bundled npm CLI fallback. No global configuration changes are required.

Learning question: why are feed availability, robots crawl guidance and a content-reuse license three different kinds of evidence?
