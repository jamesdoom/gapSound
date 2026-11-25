# Development handoff — November 25, 2026

## Status

Phase 1 remains in progress. Latest completed update: GS-006 vulnerability research (CVE Program lookup, filters, saves and explicit unknown states). Notebook editing/tags/export/Markdown (partial GS-007) remains implemented. Training session recovery and day rollover remain implemented. GS-004 intelligence discovery and GS-005 persistent deterministic briefings are complete. Scheduled due reviews are also implemented. Remaining work includes configurable objectives (GS-007), source policy review (GS-003), broader full application restart/manual assistive coverage (GS-002) and release acceptance (GS-008). No Phase 2 work is authorized.

The app remains local-first, single-user and bound to 127.0.0.1:3000. The existing protected Vercel deployment remains unsupported for application use until storage/access architecture is adapted. No hosting settings, paid services, AI providers or authentication changed. Git pushes may trigger the user's existing protected build integration.

## Latest behavior

CVE Watchtower now combines stored CISA KEV and manually retrieved CVE Program records, deduplicates identifiers, and paginates all results in pages of 20. It supports literal vendor/severity filters, a saved-only view and local save/unsave without removing research data. Metadata includes state, description/language, source publication/modification dates, assigner, CNA affected products/version ranges, CWE identifiers and safe source references. These do not establish the user's exposure.

Manual identifier lookup constructs only https://cveawg.mitre.org/api/cve/{validated-ID}; URLs are not accepted. The existing public-DNS/address-pinned, TLS-verified no-redirect transport enforces 15 seconds and 2 MiB. Persisted per-ID cooldown is 15 minutes; normal lookups reuse successful snapshots for 24 hours unless explicitly refreshed. A persisted global pending lease and provider failure/Retry-After backoff limit requests, including across restarts. No background CVE polling, API key, paid service or AI call was added.

CVSS v4.0/v3.1/v3.0 assessments retain CNA/ADP provenance. Selection prefers CNA, then newest supported version, then original source order. Displayed bands derive from reported numeric scores; vectors are not independently recomputed. Missing/unsupported scores are UNKNOWN, with actual zero retained as NONE. Other assessments remain visible. A high score does not prove exploitation; a missing KEV match leaves exploitation unknown. EPSS and NVD enrichment remain planned.

Successful snapshots and saved markers survive lookup failure. Latest error, attempt/fetch/retry times and KEV catalog freshness are visible. A 404 means no public record returned, which may be unpublished/reserved/unknown; it is not labeled nonexistent. REJECTED records display an explicit warning/rejection reason without inherited severity/affected claims. Missing fields remain unknown. Partial projection limits are flagged with a full-source link; this validates a bounded projection rather than every constraint of the full upstream schema. See docs/CVE_RESEARCH.md.

Migration 0008 adds lookup records, saved markers, provider state and a severity index. It applied locally without rewriting CISA or personal records. User data was not populated by tests. Routine verification uses labeled synthetic fixtures/injected provider responses. The separately executed live smoke test made one bounded read-only request and did not write a user record.

Notebook editing, normalized tags, safe Markdown and cursor-based exports remain implemented (migration 0007); see docs/NOTEBOOK.md. Training retains unfinished sessions across restart/midnight, actual-end recovery and rolling 168-hour completed totals; see docs/TRAINING.md. Configurable objectives remain pending.

## Verification actually executed

- 148 automated tests across 24 Vitest files passed.
- Type checking, lint without warnings and production build passed; Git whitespace checks passed.
- All 28 Chrome browser tests passed against the final build on isolated loopback port 3100. The targeted Watchtower mobile/research checks also passed before the full run.
- Service tests cover normalization/provenance, zero/unknown/rejected data, safe references/URL construction, cache/cooldown, 404/429/Retry-After, malformed/mismatched replacement preservation, pagination/filtering beyond 100 records, saved-state reconnect persistence, projection limits and transactional rollback on injected provider-state failure.
- A component regression confirms that refreshing the currently searched CVE reloads its displayed record even when filters do not change.
- Browser coverage includes combined paging/vendor/severity filters, saved reload/unsave, real cached API lookup (no live call), safe references, unknown/unavailable records, mobile accessibility and hostile-origin/invalid-ID rejection.
- The official public endpoint/record format and FIRST severity scales were checked against primary documentation. A single read-only production-transport request for CVE-2021-44228 parsed successfully: PUBLISHED, attributed ADP assessment and bounded references/truncation. No database write occurred.
- Browser checks caught a wrapping issue at 320px and an ambiguous severity-control label. Both were fixed and targeted checks passed. A new test helper also needed its Testing Library options corrected; production build/type checking passed afterward.

Prior hosted CI repair was verified at https://github.com/jamesdoom/gapSound/actions/runs/45652241919 with no annotations. CI uses SHA-pinned Node 24 actions while application checks run on Node 22. Current update checks ran locally; no new hosted CI result is claimed. Dependency versions were unchanged in this update; the previous notebook dependency audit reported zero vulnerabilities.

## Persistent briefing/review behavior

New version-2 briefings capture up to 100 unfinished due/overdue reviews plus their total count. Changes appear only after regeneration; older version-1 snapshots remain readable and explicitly say scheduled reviews were not captured. Regeneration/archive/history retain prior contents. Completed review records cannot be rescheduled; create a new record for another attempt. No automatic spaced repetition or notifications. See docs/DAILY_BRIEFINGS.md.

## Remaining limitations and next actions

- Complete configurable training objectives; the requested notebook workflows are implemented.
- Complete publisher terms/rate-policy review and full application restart coverage for the remaining critical workflows; the backend restart test above does not launch/restart the whole Next.js server.
- Complete backup/restore verification, secret scanning and final dependency/security review.
- Manual screen-reader, zoom and forced-colors checks remain; axe passing is not WCAG certification.
- CVE and notebook reads are paginated. Feed refresh lacks a cross-process lock/retry jitter; CVE lookups use persisted leases/cooldowns but no background queue.
- Private study text may appear in retained briefing snapshots and backups. No encryption at rest, undo or secure erasure is provided. Recovery of already completed sessions is not supported.

## Run and verify

Restart the dev server to load this update:

    npm run dev

Migration 0008 has applied locally. On another checkout, run npm ci and npm run db:migrate before restarting. Open http://127.0.0.1:3000 → CVE Watchtower. Browse/save local records or manually look up an identifier; inspect timestamps and provider notices before interpreting data. General checks:

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run test:e2e

Browser tests use a new temporary database on port 3100 and can run alongside the user's development server on 3000. Install Playwright Chromium or set PLAYWRIGHT_CHANNEL=chrome. Normal npm works in the user's VS Code terminal; only the restricted agent shell needs the bundled npm CLI fallback. No global configuration changes are required.

Learning question: why do an unavailable CVE record, a missing CVSS score and no match in a local KEV catalog each leave different facts unknown?
