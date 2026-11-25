# Development handoff — November 25, 2026

## Status

Phase 1 remains in progress. Latest update: persisted feed retry/backoff, Retry-After support, retry status display, and migration 0002. GS-003 still needs retention and source policy review. GS-002 still needs a full accessibility review and full application process-restart coverage.

Vercel Authentication was verified to protect all deployments in the previous update. Hosting remains unsupported for real application use until storage/auth architecture is adapted. No Vercel settings or paid services were changed this session. Git pushes may trigger the user's existing protected Vercel build integration.

## Current verification

- 80 tests across 9 Vitest files passed, including migration upgrades, HTTP header parsing, source isolation, SQLite close/reopen persistence, successful recovery and exact loopback-port checks.
- TypeScript (including production build), lint and production build passed.
- All 5 Chrome browser tests passed on isolated loopback port 3100, including retry eligibility display. The user's server on port 3000 was left alone.
- Migration 0002 applied successfully to the local database. Repeated application and upgrades from an existing schema are covered by tests.
- No live public feed calls were made in this update. The prior update verified 35 articles and 1,796 KEV records from four sources in an isolated database.

## Behavior and limitations

Failures delay the next eligible refresh by 15 minutes, 30 minutes, 1 hour and progressively up to 24 hours. Valid longer Retry-After delays on 429/503 responses take precedence. Both manual and automatic refresh honor persisted deadlines; a restart does not reset them. A retry occurs only on a later refresh while the app is open. Success resets the failure count. There is no jitter or multi-process locking; run one application server against each database.

Remaining Phase 1 work: retention and provider-policy review; accessibility and application restart tests; pagination/date filters/watchlists; full persisted daily briefings; richer CVE research; note editing and training improvements; secret scanning and backup/restore verification. Notes currently display Markdown as plain text. The app remains single-user/local-first.

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

Continue GS-003 retention/source-policy work or GS-002 accessibility/process-restart review. See LEARNING.md for how persisted deadlines prevent refresh clicks or restarts from bypassing provider rate limits. Question: why is an in-memory timer insufficient to enforce Retry-After after an application restart?
