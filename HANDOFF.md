# Development handoff — November 25, 2026

## Status

Phase 1 remains in progress. Latest completed update: training session recovery and local day rollover (partial GS-007). GS-004 intelligence discovery and GS-005 persistent deterministic briefings are complete. Scheduled due reviews are also implemented. Remaining work includes configurable objectives/notebook workflows (GS-007), richer vulnerability research (GS-006), source policy review (GS-003), broader full application restart/manual assistive coverage (GS-002) and release acceptance (GS-008). No Phase 2 work is authorized.

The app remains local-first, single-user and bound to 127.0.0.1:3000. The existing protected Vercel deployment remains unsupported for application use until storage/access architecture is adapted. No hosting settings, paid services, AI providers or authentication changed. Git pushes may trigger the user's existing protected build integration.

## Latest behavior

Unfinished sessions remain visible even when older than seven days or when the bounded history list has more than 1,000 candidates. Start remains idempotent under the existing one-active-session database index. Stop/recovery now requires the matching active UUID, protecting a replacement session from stale controls.

Daily Training offers **Recover a forgotten session**: enter the actual local end time. The browser converts it to UTC; the server checks that it lies between the original start and server time, then completes that same record transactionally. Original start/history are preserved. Closing the browser does not stop a session, and elapsed time includes time away until the user finishes or recovers it. Completed sessions cannot be edited in this update.

Daily objectives reload when the browser's local calendar day changes, with clock checks every second. Workspace also refreshes on focus/visibility return. Prior-day objectives are retained and hidden while the new day's data loads; they are not copied or deleted. Unsubmitted objective text is preserved. Scheduled review due labels follow the same local day. Midnight does not split, stop or restart an active session.

Completed study minutes now aggregate all overlaps with the rolling last 168 hours, clip the window boundary and exclude unfinished time. This total does not depend on the 1,000-item history display cap. History prioritizes unfinished sessions. History and total are separate reads, so a concurrent completion may require another refresh. See docs/TRAINING.md.

No schema migration was required; migration 0006 from the previous update remains current. Tests used isolated fixtures and did not create personal study records or change user data. No live feed calls were made.

## Verification actually executed

- 133 automated tests across 19 Vitest files passed.
- Type checking, lint (no warnings), production build and Git whitespace checks passed.
- All 26 Chrome browser tests passed against the final build on isolated loopback port 3100.
- New browser coverage verifies reload recovery with an exact local end time, populated recovery-form mobile accessibility, and simulated local midnight in America/New_York: prior-day objectives retained, new objectives assigned to the new day, review labels updated, same active session retained.
- New service tests cover old active sessions, duplicate starts, invalid/future ends, stale UUID protection, seven-day clipping, unfinished-time exclusion and totals unaffected by history limits.
- A restart test launches separate Node backend processes against one temporary SQLite file, verifies the same active record survives exits/restarts, completes it through recovery and verifies the result in a later process. It also reads training alongside article discovery to cover transaction contention. Each child is bounded to ten seconds; that test has a 30-second limit because Windows process launches exceeded Vitest's default five seconds during the first run.
- Browser verification caught concurrent training/article transaction contention in workspace loading. The read-only training path no longer opens an unnecessary transaction; completion remains transactional. Targeted checks and the full browser suite passed after correction.

Prior hosted CI repair was verified at https://github.com/jamesdoom/gapSound/actions/runs/45652241919 with no annotations. CI uses SHA-pinned Node 24 actions while application checks run on Node 22. Current update checks above ran locally; no new hosted CI result is claimed.

## Persistent briefing/review behavior

New version-2 briefings capture up to 100 unfinished due/overdue reviews plus their total count. Changes appear only after regeneration; older version-1 snapshots remain readable and explicitly say scheduled reviews were not captured. Regeneration/archive/history retain prior contents. Completed review records cannot be rescheduled; create a new record for another attempt. No automatic spaced repetition or notifications. See docs/DAILY_BRIEFINGS.md.

## Remaining limitations and next actions

- Complete configurable training objectives and notebook editing, tag organization, export pagination and safe Markdown rendering.
- Expand authoritative CVE research, severity/vendor filtering and saved vulnerabilities.
- Complete publisher terms/rate-policy review and full application restart coverage for the remaining critical workflows; the backend restart test above does not launch/restart the whole Next.js server.
- Complete backup/restore verification, secret scanning and final dependency/security review.
- Manual screen-reader, zoom and forced-colors checks remain; axe passing is not WCAG certification.
- Notes still display Markdown as plain text; CVE/notes results cap at 100. Feed refresh lacks a cross-process lock/retry jitter.
- Private study text may appear in retained briefing snapshots and backups. No encryption at rest, undo or secure erasure is provided. Recovery of already completed sessions is not supported.

## Run and verify

Restart the dev server to load this update:

    npm run dev

Open http://127.0.0.1:3000 → Daily Training. Start/stop a session or recover an unfinished one with its actual end time. No new migration is needed for this update. General checks:

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run test:e2e

Browser tests use a new temporary database on port 3100 and can run alongside the user's development server on 3000. Install Playwright Chromium or set PLAYWRIGHT_CHANNEL=chrome. Normal npm works in the user's VS Code terminal; only the restricted agent shell needs the bundled npm CLI fallback. No global configuration changes are required.

Learning question: why should an unfinished session survive midnight while its completed duration is clipped to the rolling reporting window?
