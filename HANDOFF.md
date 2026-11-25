# Development handoff — November 25, 2026

## Status

Phase 1 remains in progress. Latest update: article pagination and inclusive UTC publication-date filtering (GS-004, still in progress). GS-003 still needs source policy review. GS-002 now has automated accessibility and keyboard checks; real assistive-technology review and full application process-restart coverage remain.

Vercel Authentication was verified to protect all deployments in the previous update. Hosting remains unsupported for real application use until storage/auth architecture is adapted. No Vercel settings or paid services were changed this session. Git pushes may trigger the user's existing protected Vercel build integration.

## Current verification

- 95 tests across 12 Vitest files passed, including migration upgrades, HTTP header parsing, source isolation, SQLite close/reopen persistence, successful recovery and exact loopback-port checks.
- TypeScript (including production build), lint and production build passed.
- All 21 Chrome browser tests passed on isolated loopback port 3100: axe default-rule scans across six screens at 1280/320px, keyboard skip/search/collapsed navigation and focus, success announcements, and seven workflow tests including paging beyond 100 and date-filter resets. All views passed horizontal-overflow checks. Desktop/mobile screenshots were inspected. The user's server on port 3000 was left alone.
- No migration was needed in this update. Migration 0003 (retention eligibility index) was applied in the previous update. Repeated application and upgrades from an existing schema are covered by tests.
- No live public feed calls were made in this update. The prior update verified 35 articles and 1,796 KEV records from four sources in an isolated database.

## Behavior and limitations

Failures delay the next eligible refresh by 15 minutes, 30 minutes, 1 hour and progressively up to 24 hours. Valid longer Retry-After delays on 429/503 responses take precedence. Both manual and automatic refresh honor persisted deadlines; a restart does not reset them. A retry occurs only on a later refresh while the app is open. Success resets the failure count. There is no jitter or multi-process locking; run one application server against each database.

Retention is manual: Settings previews unbookmarked metadata ingested more than 90 days ago, with up to 400 IDs and a 15-minute preview expiry. Deletion rechecks current bookmarks and age. Notes, study records, sources and KEV remain outside cleanup. No cleanup ran against user data; migration 0003 only added an index. There is no automatic deletion, undo or secure erasure. Source feeds may reintroduce removed records.

Remaining Phase 1 work: provider-policy review; manual assistive-technology/zoom review and application restart tests; related CVEs/watchlists/feed normalization; full persisted daily briefings; richer CVE research; note editing and training improvements; secret scanning and backup/restore verification. Notes currently display Markdown as plain text. The app remains single-user/local-first.

## Run instructions

Normal npm works in the user's VS Code terminal. The earlier failure was limited to the restricted agent environment; no npm installation repair is needed.

    npm run db:migrate
    npm run dev

Open http://127.0.0.1:3000. If the dev server was already running during the update, restart it after migration. Verification commands:

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run test:e2e

Browser tests require Playwright Chromium or PLAYWRIGHT_CHANNEL=chrome, use a fresh temporary database and port 3100, and can run alongside local development on 3000. Temporary test data is retained for diagnosis. Restricted agent commands may use the bundled npm CLI path; restricted Git may need command-scoped safe.directory or authorized execution. No global configuration changes are necessary.

## Next action and learning

Continue GS-003 source-policy review or GS-002 application process-restart coverage. See LEARNING.md for how persisted deadlines prevent refresh clicks or restarts from bypassing provider rate limits. Question: why is an in-memory timer insufficient to enforce Retry-After after an application restart?

## CI repair

Reported run 45650558675 failed its sixth browser test (retention success feedback); the Node 20 message was a separate action-runtime warning. Authenticated job logs were inspected using the existing Git credential helper in memory, without writing or displaying credentials. A deterministic component test reproduced the Settings key/remount race before the fix and passed afterward. Only the preference form now remounts, preserving retention state. Checkout v7.0.1, setup-node v7.1.0 and upload-artifact v7.0.2 were verified from official action metadata as Node 24 actions and pinned by SHA. Application runtime remains Node 22. Failed browser diagnostics are retained for seven days; local data/secrets are excluded. The fix commit passed local checks: 86 tests, 20 Chrome browser tests, typecheck, lint and production build. GitHub did not register a push-triggered run during initial polling despite main and workflow being current/active. Manual workflow dispatch is now enabled so the same checks can be explicitly run from Actions.

Hosted verification completed successfully: https://github.com/jamesdoom/gapSound/actions/runs/45652241919 (commit be5b0bc). All checks passed, including Chromium browser tests and npm audit. The verify job annotations API returned an empty list: no errors or deprecation warnings. This confirms the original failure and warning are resolved on the Linux runner, not just locally.

## Intelligence browsing update

Article pages contain 25 records, show matching counts, and reset to page one when filters change. UTC publication ranges include both selected days and exclude unknown dates; ingestion dates remain distinct. Queries are validated/parameterized and page offsets bounded. A deterministic publication-date/ID sort and shared transaction keep counts and rows consistent in an unchanged dataset. CVE and note paging remain pending. No migration or user-data edits were needed, and no paid services or Vercel settings changed.

Verification for article browsing: 95 tests across 12 Vitest files, 21 Chrome browser tests, explicit typecheck, lint and production build passed. No migration is required. The fixture database includes 103 additional synthetic paging records; no user records were modified.
