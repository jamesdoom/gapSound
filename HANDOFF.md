# Development handoff — November 25, 2026

## Status

Phase 1 remains in progress. Latest completed update: research notebook editing, tag organization, paginated exports and safe Markdown (partial GS-007). Training session recovery and day rollover remain implemented. GS-004 intelligence discovery and GS-005 persistent deterministic briefings are complete. Scheduled due reviews are also implemented. Remaining work includes configurable objectives (GS-007), richer vulnerability research (GS-006), source policy review (GS-003), broader full application restart/manual assistive coverage (GS-002) and release acceptance (GS-008). No Phase 2 work is authorized.

The app remains local-first, single-user and bound to 127.0.0.1:3000. The existing protected Vercel deployment remains unsupported for application use until storage/access architecture is adapted. No hosting settings, paid services, AI providers or authentication changed. Git pushes may trigger the user's existing protected build integration.

## Latest behavior

Research Notebook now uses a dedicated bounded same-origin API. Lists/search use pages of 20 instead of silently capping at 100; literal searches cover title, body and tags. Existing workspace search controls this view. Note editing retains creation timestamps, records UTC edit time and compares revision numbers transactionally. Stale saves preserve the local draft and refresh the list, allowing cancel/reopen of the latest version.

Tags are normalized/deduplicated on save and indexed for exact filtering. Edit tags per note, select a filter or click a note tag. The menu shows the 100 most-used tags and notebook-wide counts. No global rename/delete is implemented. Limits: 20 tags of 40 characters, 500 total tag-field characters, title 200 and body 20,000. Markdown source whitespace is preserved; blank-only bodies are rejected.

Markdown/preview uses project-local react-markdown with an element allowlist, inert HTML, omitted images and validated absolute HTTPS links only. It makes no remote requests and executes no content. Headings fit the note/preview hierarchy. Raw source is preserved for exports. No HTML plugins, AI or executable features were added.

Exports include individual Markdown, current-page JSON and all-matching JSON. All-matching export traverses batches of 20 by creation-time/ID cursor beyond the former 100-note cap. New records after the initial cutoff are excluded. Limits are 10,000 records and 10 MiB of final JSON; exceeding them shows an error without a partial download. Export follows captured search/tag filters and is a live multi-batch read, not a consistent database snapshot. Avoid concurrent edits when consistency matters. Drafts are not persisted across navigation/reload.

Migration 0007 adds revision/edit-time columns, history and tag indexes; legacy tags are backfilled without rewriting original note content or timestamps. It applied locally. Personal notes were not edited by tests; all verification fixtures are isolated. Notes no longer travel through the unrelated workspace endpoint, though its legacy note mutation delegates to the same validated service. Listing count/items/tag counts are separate reads to avoid unnecessary write-transaction contention; refresh reconciles concurrent writes. See docs/NOTEBOOK.md.

Training still preserves unfinished sessions across restarts/midnight, offers actual-end recovery and clips completed totals to the rolling 168-hour window. The previous backend-process restart test remains; whole Next.js restart coverage for every module is still pending. See docs/TRAINING.md.

## Verification actually executed

- 139 automated tests across 22 Vitest files passed.
- Type checking, lint without warnings and production build passed. Git whitespace checks passed.
- All 27 Chrome browser tests passed on isolated loopback port 3100, including JSON export content/unique IDs for 103 matching notes, paging/tag filters, edit/reload persistence, stale draft preservation/reopening, populated mobile accessibility and hostile-origin/malformed-cursor rejection.
- New tests cover migration preservation, significant Markdown whitespace, exact tags, literal wildcard characters, stable ordering/cursor traversal beyond 100 notes, stale edits, input bounds and rollback after injected tag-index failure.
- Markdown tests verify structure and inert HTML, omitted images and unsafe/local URL rejection. A component test confirms oversized all-note exports fail without a partial download.
- The final significant-whitespace validation adjustment passed the full automated suite, rebuilt production app, typecheck/lint and both targeted notebook browser workflows afterward.
- Browser testing caught ambiguous test selectors matching the hidden preview/Next route announcer; scoped them to the intended content. Full suite passed after correction.
- npm audit reported zero vulnerabilities after adding react-markdown and its locked dependencies. No live feeds, external note references or AI calls were used.

Prior hosted CI repair was verified at https://github.com/jamesdoom/gapSound/actions/runs/45652241919 with no annotations. CI uses SHA-pinned Node 24 actions while application checks run on Node 22. Current update checks ran locally; no new hosted CI result is claimed.

## Persistent briefing/review behavior

New version-2 briefings capture up to 100 unfinished due/overdue reviews plus their total count. Changes appear only after regeneration; older version-1 snapshots remain readable and explicitly say scheduled reviews were not captured. Regeneration/archive/history retain prior contents. Completed review records cannot be rescheduled; create a new record for another attempt. No automatic spaced repetition or notifications. See docs/DAILY_BRIEFINGS.md.

## Remaining limitations and next actions

- Complete configurable training objectives; the requested notebook workflows are implemented.
- Expand authoritative CVE research, severity/vendor filtering and saved vulnerabilities.
- Complete publisher terms/rate-policy review and full application restart coverage for the remaining critical workflows; the backend restart test above does not launch/restart the whole Next.js server.
- Complete backup/restore verification, secret scanning and final dependency/security review.
- Manual screen-reader, zoom and forced-colors checks remain; axe passing is not WCAG certification.
- CVE results still cap at 100; notebook reads are paginated. Feed refresh lacks a cross-process lock/retry jitter.
- Private study text may appear in retained briefing snapshots and backups. No encryption at rest, undo or secure erasure is provided. Recovery of already completed sessions is not supported.

## Run and verify

Restart the dev server to load this update:

    npm run dev

Migration 0007 has applied locally. On another checkout, run npm ci and npm run db:migrate before restarting. Open http://127.0.0.1:3000 → Research Notebook to edit, filter and export notes. General checks:

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run test:e2e

Browser tests use a new temporary database on port 3100 and can run alongside the user's development server on 3000. Install Playwright Chromium or set PLAYWRIGHT_CHANNEL=chrome. Normal npm works in the user's VS Code terminal; only the restricted agent shell needs the bundled npm CLI fallback. No global configuration changes are required.

Learning question: why does a multi-page export need stable cursor ordering, and why does that alone not make concurrent edits a consistent database snapshot?
