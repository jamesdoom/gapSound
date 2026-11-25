# GAPSOUND

**Know the threat. Protect the gap.**

A local cybersecurity intelligence and training workspace. The name reflects defensive discipline: understand threats, account for responsibilities and close vulnerabilities. This is an initial Phase 1 implementation, with remaining acceptance criteria tracked in TASKS.md.

## Available now

- Command Center daily briefings are saved snapshots with generation, regeneration, archiving and history. They include source-linked news/KEV additions, source freshness, recorded objectives and rule-based learning/review prompts. Article filters do not change saved content. See [daily briefing behavior and limits](docs/DAILY_BRIEFINGS.md). No AI key is required.

- Hardened RSS/Atom/RDF metadata normalization with source-shape fixtures, entity decoding, safe-link deduplication and explicit publication dates. Full article bodies are not copied. See [normalization contracts and limits](docs/FEED_NORMALIZATION.md).

- Article CVE mentions link to the CVE Program. A mention is not proof of a valid record or exploitation; matches in the imported CISA KEV catalog are separately labeled. Only stored title/summary metadata is scanned, not full articles. No extra network lookup is performed.
- Threat Intelligence watchlists persist up to 50 named lists, each with 1–10 terms (60 characters each). Matches use any literal term in title/summary; English case is ignored. Use the watchlist filter to see matching articles and matched terms. Lists can be edited or removed with confirmation; article data is preserved. There are no automatic alerts or notifications.

- Dark responsive command center with actual persisted counts and persisted rule-based daily briefings.
- RSS metadata from SANS ISC, KrebsOnSecurity and BleepingComputer, plus CISA KEV catalog ingestion.
- Article search, source/category filters, bookmarks, read state and source refresh health.
- KEV search by CVE, vendor and product, with remediation and provenance. CVSS/EPSS are not yet integrated.
- Daily training objectives, persistent session start/stop and rolling seven-day study totals.
- Research notes with tags, text search and Markdown/JSON exports.
- Persisted study goals and refresh interval. Future modules are labeled planned.

## Install and run

Requires Node.js 22.18+ and npm. On Windows, use PowerShell. No API key or paid account is required.

```powershell
npm ci
npm run db:migrate
npm run dev
```

Open http://127.0.0.1:3000. Click **Refresh sources** to populate intelligence; a clean install contains no demonstration telemetry. Refresh runs automatically at the configured interval while the browser workspace remains open. SANS has a 60-minute minimum cooldown; other feeds have a 15-minute minimum. Consecutive failures double from each source floor up to 24 hours. HTTP 429/503 Retry-After delays take precedence when longer; waiting periods survive restarts. Refresh is attempted at the next manual or automatic refresh after eligibility, not by a background timer. No background daemon runs after the workspace closes.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

SQLite lives in ignored `data/gapsound.db`. Migrations are transactional and version tracked. `.env.example` describes the credential-free initial configuration. Stack: Next.js App Router, React, TypeScript, Tailwind, Lucide, Zod, Drizzle, local libSQL/SQLite, Vitest, ESLint and Prettier. Lockfile records exact dependency versions. Local libSQL avoids requiring a Windows C++ build toolchain; it is not a hosted database subscription. shadcn, Recharts and TanStack Table are deferred until a feature needs them.

## Backup and restore

Settings → **Feed data retention** previews unbookmarked article metadata ingested more than 90 days ago. Nothing is deleted until you confirm removal. Cleanup processes at most 400 previewed records and rechecks bookmarks before deletion. A preview expires after 15 minutes. Notes, bookmarks, study records, sources and KEV records are preserved. Cleanup removes the selected article records and their read status; there is no undo. Source feeds can reintroduce removed articles during a later refresh. No automatic retention job runs.

Stop GapSound before backup or restore. Copy the entire `data` directory to a private backup location. To restore, stop the app, retain a copy of current data, then replace `data` with the backup and run `npm run db:migrate`. Notes can also be exported individually as Markdown or as JSON for the current search view (up to 100 results). Automated restore testing remains pending.

## Troubleshooting and limitations

- Standard `npm` works in the VS Code terminal. A restricted agent environment may need the bundled CLI path; this does not indicate a broken local npm installation.
- Database setup errors: stop the server and run `npm run db:migrate` from the repository root.
- Keep port 3000 and localhost defaults. Host/origin checks intentionally reject other ports/hosts.
- Source failures show a retry-eligible timestamp and failure count in Command Center. Manual refresh respects the same waiting period; do not bypass source access restrictions.
- Feed availability and terms can change. See docs/INTEGRATIONS.md for verification status.
- Article browsing uses 25-record pages with matching counts and inclusive UTC publication-date filters. Unknown publication dates are excluded when a date filter is active. Search/source/category/saved/date changes return to page one. Page requests are bounded at 10,000 (250,000 accessible matches); cursor pagination remains a future scalability improvement.
- CVE and notebook results are paginated. Daily Training supports manually scheduled due reviews, rescheduling and retained completion history. New briefings capture due reviews; adaptive spaced repetition remains planned.
- Notes currently display Markdown as safe plain text. Editing/deleting notes is pending.
- Local workspace has no authentication, encryption at rest or public hosting support. Browser tabs may share the same database. Do not place sensitive incident data here.
- Source fetching validates and pins DNS answers to public addresses. See SECURITY.md for remaining platform and local-process risks.
- Browser tests cover persisted workflows, malicious note content, mobile overflow and API security boundaries. Full Next.js process-restart, reflow and forced-colors regressions are included. Native screen-reader/zoom/contrast-theme signoff remains pending after a Computer Use safety block; see docs/ACCESSIBILITY.md.

See HANDOFF.md for current results and next work. Desktop/mobile screenshots were reviewed as local test artifacts; they contain synthetic test records and are not live intelligence screenshots.

## Browser regression tests

The browser suite includes axe scans and keyboard/reflow checks for implemented screens. Review scope and remaining manual checks are documented in [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md); passing automation is not a conformance claim.

```powershell
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests start their own isolated production server on port 3100; your development server can stay on port 3000. Each invocation uses a new temporary database and labeled synthetic fixtures, with no public feed requests. Test directories are retained for debugging; remove only known `gapsound-e2e-*` folders from your OS temporary directory when no tests are running. To use installed Chrome on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:e2e
```

`GAPSOUND_DATA_DIR` can override the normal data directory. Browser tests always override it with a fresh temporary directory.

Daily Training preserves unfinished sessions across restarts and midnight. Use **Recover a forgotten session** to record an actual local end time; daily objectives refresh at local midnight without deleting yesterday’s plan. See [training behavior](docs/TRAINING.md).

Research Notebook supports revision-checked editing, normalized tag filters, safe Markdown/preview and paginated JSON/Markdown exports. See [notebook behavior and limits](docs/NOTEBOOK.md).

CVE Watchtower supports manual authoritative CVE Program lookup, provenance-labeled CVSS v3/v4 assessments, vendor/severity filters, saved vulnerabilities and explicit unknown/unavailable states. See [CVE research behavior and limits](docs/CVE_RESEARCH.md). No API key is required.

Publisher policies are documented in [the dated review register](docs/SOURCE_POLICIES.md) and shown in Settings. SANS requests are limited to once per hour even with faster settings/manual refresh; other feeds retain a 15-minute app floor. This local reader is not cleared for public redistribution; unresolved publisher notice/reuse gates remain tracked in GS-003.

Full application restart and forced-colors/reflow regressions run with npm run test:e2e. For the remaining native manual checks, npm run test:a11y:manual starts an isolated synthetic workspace on 127.0.0.1:3102 with publisher requests held by cooldowns. See [review evidence and the manual checklist](docs/ACCESSIBILITY.md); automated reflow and emulation do not replace screen-reader/native zoom/theme signoff.

Consistent SQLite backup and non-overwriting restore are available through `npm run db:backup -- <new-bundle-directory>` and `npm run db:restore -- <bundle-directory> <new-data-directory>`. Run `npm run security:secrets` for pinned, redacted history/workspace scanning. Read [release evidence and recovery instructions](docs/RELEASE_ACCEPTANCE.md) before recovery; backups contain private data.
