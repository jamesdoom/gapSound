# GAPSOUND

**Know the threat. Protect the gap.**

A local cybersecurity intelligence and training workspace. The name reflects defensive discipline: understand threats, account for responsibilities and close vulnerabilities. This is an initial Phase 1 implementation, with remaining acceptance criteria tracked in TASKS.md.

## Available now

- Dark responsive command center with actual persisted counts and a basic deterministic briefing.
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

Open http://127.0.0.1:3000. Click **Refresh sources** to populate intelligence; a clean install contains no demonstration telemetry. Refresh runs automatically at the configured interval while the browser workspace remains open. Sources have a 15-minute cooldown including failures. No background daemon runs after the workspace closes.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

SQLite lives in ignored `data/gapsound.db`. Migrations are transactional and version tracked. `.env.example` describes the credential-free initial configuration. Stack: Next.js App Router, React, TypeScript, Tailwind, Lucide, Zod, Drizzle, local libSQL/SQLite, Vitest, ESLint and Prettier. Lockfile records exact dependency versions. Local libSQL avoids requiring a Windows C++ build toolchain; it is not a hosted database subscription. shadcn, Recharts and TanStack Table are deferred until a feature needs them.

## Backup and restore

Stop GapSound before backup or restore. Copy the entire `data` directory to a private backup location. To restore, stop the app, retain a copy of current data, then replace `data` with the backup and run `npm run db:migrate`. Notes can also be exported individually as Markdown or as JSON for the current search view (up to 100 results). Automated restore testing remains pending.

## Troubleshooting and limitations

- If your Windows npm shim points to a missing roaming installation, use `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" ci` and the same prefix for `run dev`, etc. No system configuration changes are needed.
- Database setup errors: stop the server and run `npm run db:migrate` from the repository root.
- Keep port 3000 and localhost defaults. Host/origin checks intentionally reject other ports/hosts.
- Source failures are isolated and shown in Command Center. Retry after cooldown; do not bypass source access restrictions.
- Feed availability and terms can change. See docs/INTEGRATIONS.md for verification status.
- Search results cap at 100; pagination/date filters/watchlists and richer briefings are pending.
- Notes currently display Markdown as safe plain text. Editing/deleting notes is pending.
- Local workspace has no authentication, encryption at rest or public hosting support. Browser tabs may share the same database. Do not place sensitive incident data here.
- Source allowlisting is not DNS pinning. See SECURITY.md for residual SSRF and local-process risks.
- Browser tests cover persisted workflows, malicious note content, mobile overflow and API security boundaries. Full accessibility review and process-restart persistence tests remain pending.

See HANDOFF.md for current results and next work. No screenshots are included until browser review is completed.

## Browser regression tests

```powershell
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests start their own production server on port 3000; stop any existing GapSound server first. Each invocation uses a new temporary database and labeled synthetic fixtures, with no public feed requests. Test directories are retained for debugging; remove only known `gapsound-e2e-*` folders from your OS temporary directory when no tests are running. To use installed Chrome on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:e2e
```

`GAPSOUND_DATA_DIR` can override the normal data directory. Browser tests always override it with a fresh temporary directory.
