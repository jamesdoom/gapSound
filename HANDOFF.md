# Development handoff — November 25, 2026

## Status

Phase 1 remains in progress. Latest update: full reviewed CVE/CISA notices and publisher attribution through local storage, APIs, new snapshots and backups, plus recognized feed notice retention. GS-007 configurable objective plans remain complete. Remaining acceptance gates are broader publisher reuse permissions (GS-003), native screen-reader/zoom/contrast-theme signoff (GS-002), supported-tooling maintenance and final release reconciliation (GS-008). No Phase 2 work is authorized.

The app remains local-first, single-user and bound to 127.0.0.1:3000. The existing protected Vercel deployment remains unsupported for application use until storage/access architecture is adapted. No hosting settings, paid services, AI providers or authentication changed. Git pushes may trigger the user's existing protected build integration.

## Latest publisher notice update

Packaged the complete reviewed CVE copyright/license/disclaimers and CISA KEV license in src/lib/publisher-notices.json. Primary CVE terms/footer source was pinned at CVEProject/cve-website commit 9d1ab813f5274ffc136e0bf55e74f9cf1b552da9 and compared with the served website asset; copyright year 2026 is the dated review's explicit value. SANS guidance, Krebs copyright and BleepingComputer terms were rechecked without contacting publishers or collecting article bodies. Exact legal-text fingerprints, links, bounds, scope and remaining gates are in docs/PUBLISHER_NOTICES.md.

Migration 0010 stores the bundle in dataset_notices and adds nullable article publisher_notice. A verified pre-migration backup was created under ignored data/backups/pre-notices-0010, then npm run db:migrate applied 0010 locally. Existing snapshot JSON and personal records were not rewritten/deleted. libSQL transaction.executeMultiple now parses migration scripts natively so license literals can contain semicolons; regression tests prove failed scripts roll back schema/data and migration markers.

New CVE projections embed the full CVE notice. New briefings embed the complete reviewed bundle and per-article notices, while old snapshot views explicitly show supplemental notices without rewriting their saved contents. Settings, article cards and vulnerability/briefing views display attribution and escaped/wrapped notices. GET /api/notices supplies a local-only attachment, and workspace/CVE/briefing API reads carry notices alongside data. URLs are references only; viewing/downloading makes no publisher request. React best-practices review covered the changed components and the shared disclosure component.

Recognized RSS/RDF/Atom copyright/rights/text-license fields are retained as deduplicated plain text, up to 5,000 characters per article. Oversized/unsupported structured notices reject the source import rather than clipping notices. A refresh that omits notices preserves the previously stored notice; a new supplied notice replaces current article metadata. This is not a universal parser for proprietary notices in prose/full articles, and absent legacy notices cannot be reconstructed. Existing bookmarks/read state and saved briefing notices are retained.

New backup bundles include publisher-notices.json and a manifest SHA-256; restore verifies/copies that sidecar when present. Backup uses the snapshot's stored bundle, or supplies the packaged notice for a legacy pre-0010 database without modifying that source. Legacy manifests without the optional field remain readable and are not represented as verified sidecars. Notice packaging covers publisher datasets, not GapSound's source license or dependency distribution obligations. Notebook exports remain user-authored/manually pasted text; arbitrary pasted rights cannot be inferred.

No dependency, paid service, publisher-network runtime call, hosting setting, authentication or Phase 2 change was added. The technical CVE/CISA packaging gate is implemented; broader Krebs reuse and public/commercial SANS/BleepingComputer/publisher-briefing rights remain unresolved. GS-003 remains in progress. Native accessibility signoff is still separate.

## Current verification actually executed

- 166 unit/component tests across 29 files passed with maxWorkers=4, including full-text fingerprints, migration bundle equality, source notice persistence/immutable briefings, inert rendering, SQL literal/rollback handling and notice-sidecar restore/tamper rejection.
- Final typecheck, lint without warnings and production build passed after the Node-compatible JSON import fix.
- Focused Chrome notice workflow passed: visible attribution/full CVE license, local download filename/headers, API notice propagation, cross-origin denial, 320px wrapping/default axe, and no external browser requests.
- The final full Chrome suite passed all 50 tests, including notice download/offline rendering, normal and forced-colors reflow, critical workflows, production restart and backup restore with retained article/briefing notices. The initial full run stopped before tests because Node's ESM restart-test import required an explicit JSON import attribute; the standard with-type-json import fixed that cross-runtime issue and the full unit suite also passed again afterward.
- Gitleaks scanned all 21 available commits and current non-ignored workspace files with no findings. No hosted CI success is claimed.
- Local pre-migration backup and migration 0010 succeeded. No dependency installation or personal-data restore was performed.

## Previous configurable objectives update

Daily Training now contains a reusable objective plan with up to 20 distinct ordered titles. The user can add/edit/remove/reorder, save with revision checks, and explicitly apply the saved plan once per local day. Failed saves preserve the draft; Reload saved plan explicitly replaces it. Unsaved changes disable application. Initial loads are abortable and reads create no tasks. The editor uses stable entry keys, labeled controls and status/error announcements; React best-practices review was applied.

Application verifies the current day against the supplied IANA zone and server clock, copies unchecked tasks after existing one-off objectives, and writes a unique daily application marker in the same transaction. Saving/reordering/clearing a plan changes future applications only. Already applied days cannot apply a revised plan again. Both one-off additions and plan application enforce a shared 100-objective daily limit. Legacy task IDs/titles/days/completions are preserved with position zero and deterministic ID ties; new tasks append. Workspace and briefing generation use position/ID ordering. Existing saved briefings remain unchanged.

Migration 0009 adds task positions, the revisioned plan and daily application records. A verified pre-migration backup was created in the ignored data/backups/pre-objectives-0009 directory before npm run db:migrate applied 0009 to the local workspace. No personal records were deleted and no restore was performed. Other checkouts must run npm run db:migrate before restarting. No new dependency, external request, hosting change, paid service, authentication or Phase 2 feature was introduced. See docs/TRAINING.md.

## Previous objective update verification

- 160 unit/component tests across 27 files passed, including plan validation/order, stale saves, atomic rollback, daily limits, future-day history preservation, immutable briefing snapshots and editor loading/error/draft behavior.
- Migration regression verifies an existing completed task retains title/day/completion and receives position zero; migration reruns apply nothing.
- Typecheck, lint without warnings and final production build passed.
- The corrected populated-plan browser scenario passed in isolation, including saved ordering, preserved daily completions, stale and oversized request rejection, no-Origin/cross-origin rejection, 320px reflow and axe. The final full Chrome suite passed all 49 tests, including production restart/restore, briefing creation/history, session recovery and local midnight.
- The first concurrent build/test run timed out an existing 10-second child-process fixture; a complete rerun without the concurrent build passed. Initial lint also found an unescaped apostrophe, corrected before the passing lint/build.
- The initial browser run found reorder buttons whose accessible names did not contain their visible wording; corrected to Move up/Move down followed by the objective number. The new checkbox assertion now waits for server-confirmed state. The accessibility failure interrupted session recovery and caused a later shared-fixture midnight test to fail; The next full run passed 48/49 tests but exposed a shared-fixture interaction: the new browser test had generated a briefing before the existing briefing creation scenario. Removed that unrelated browser setup; immutable briefing behavior remains verified in the isolated objective service test and the restart/restore scenario. The final 49-test full suite passed after this test isolation correction.
- Gitleaks scanned all 20 available commits and current non-ignored workspace files with no findings. No new hosted CI result is claimed. Local backup and migration succeeded; 0009 is current.

## Previous release acceptance update

Added terminal-only npm run db:backup -- <new-bundle-directory> and npm run db:restore -- <bundle-directory> <new-data-directory>. Backups use SQLite VACUUM INTO for a consistent committed snapshot including WAL, followed by integrity/foreign-key/migration checks and a SHA-256 manifest. Restore copies into a new directory and verifies the copy; existing directories cannot be replaced. Parent directories may be created. Failed output is retained for diagnosis and must not be used. Commands do not copy a live database file alone, expose filesystem operations through HTTP or modify personal records. Only trusted bundles should be restored; hashes are not signatures. No encryption/off-device recovery is provided.

The actual production restart browser scenario now takes a backup after API writes, restores into a separate directory, starts Next.js against the restored database and verifies completed session/review state and archived briefing identity/content. Unit tests cover live WAL snapshots excluding later edits, checksum tampering, overwrite refusal, missing migration history, orphan foreign keys and malformed manifests. CLI smoke checks passed with a synthetic seeded database and paths containing spaces. No personal backup/restore was performed.

Added npm run security:secrets using official Gitleaks 8.30.1, hard-coded verified Windows/Linux x64 archive SHA-256 and fully redacted output. Scans cover available Git history and tracked/non-ignored workspace content, excluding ignored private databases/env files. CI fetches full history and runs scanning before npm ci. Local 19-commit history and workspace scans passed without findings; a generated high-entropy synthetic credential was detected with its value absent from captured output. No allowlist was needed. An initial repeated-character probe did not meet entropy criteria; the realistic probe passed. Scanner temp copies inherit workstation permissions.

Pinned top-level packages to existing lockfile versions without upgrades. Fresh npm audit returned zero vulnerabilities. Reviewed registry resolution/integrity, install-script metadata (esbuild and optional macOS fsevents), and license metadata including MPL/LGPL/CC-BY obligations to assess before packaging. npm reports ESLint 9.39.5 unsupported; a compatible tooling upgrade remains maintenance work. A clean npm ci --ignore-scripts passed in an isolated temporary directory. Workspace npm ci initially failed on in-use native Windows modules; npm install --ignore-scripts repaired the workspace successfully, leaving only locked stale-directory cleanup warnings. The user's process was not stopped and no global configuration changed.

Reviewed local Host/Origin/Fetch Metadata, input bounds, fixed/DNS-pinned transport, Markdown/safe links, CSP, migrations, mutation boundaries and SHA-pinned read-only CI. No public deployment, new web endpoint, paid service or Phase 2 work was added. Detailed evidence, limitations and recovery instructions are in docs/RELEASE_ACCEPTANCE.md. GS-008 remains in progress because configurable objectives, publisher reuse/CVE notice packaging and native accessibility acceptance remain open.

## Previous release-check verification

- 154 Vitest tests across 25 files passed after final backup validation changes.
- Typecheck, lint without warnings and production build passed after final code changes.
- All 48 Chrome browser tests passed, including production recovery from a verified restored snapshot, critical workflows, origin/rebinding rejection and the existing accessibility matrix.
- Backup/restore CLI entrypoints passed a synthetic round trip with spaced paths; the user's database was not used.
- Gitleaks history/workspace scans and synthetic detection/redaction control passed; fresh npm audit reported zero known vulnerabilities.
- Isolated clean installation passed. The initial workspace install failure and repair are recorded above; no clean workspace npm ci pass is claimed.
- No new hosted CI success is claimed. The new Linux scanner path will run in CI; local execution verified the Windows path.
- No schema migration was needed (0008 remains current). Phase 1 and public-release acceptance remain incomplete.

## Previous persistence/accessibility update

The browser suite now restarts the actual production Next.js server against one isolated database, checks a new PID and a stopped endpoint, then verifies persisted articles/read/bookmarks, completed objectives/preferences, unfinished sessions/source retry deadlines, edited notebook content/revisions/tag index, watchlists, reviews, saved CVEs/cached lookup and saved briefing identity/content. It completes the session/review and archives the briefing, restarts again and verifies those later states. The scenario runs on test-owned loopback port 3101; the regular suite stays on 3100. No application control/shutdown endpoint was added. Child processes are created/terminated by the test itself and their startup/shutdown waits are bounded.

Accessibility automation now covers six screens at 1280, 640 and 320 CSS pixels with default axe rules, no horizontal page/nav overflow and keyboard/focus checks. Widths 640/320 exercise the layout equivalent to 200%/400% of a 1280 baseline; they are not actual native browser zoom operations. Twelve forced-colors emulation cases cover 1280/320, with system-palette control/field/link/disabled/focus styles and a border/font-weight cue for active navigation. Agent review of captured emulation images found clipped mobile labels; mobile navigation now wraps in two columns and exposes labels even after desktop collapse. Final image review is not a human screen-reader or native Windows theme pass.

Native Windows input was stopped by the Computer Use helper because it could not confidently verify the current browser URL for policy enforcement. No further desktop app input was attempted. NVDA was absent in the standard paths checked; Narrator was not launched and no spoken output was verified. **Screen-reader speech, real browser zoom and native Windows contrast-theme signoff remain pending.** GS-002 is still in progress. See docs/ACCESSIBILITY.md for the exact barrier, skill guidance and the concrete remaining checklist.

A new npm run test:a11y:manual command starts a synthetic temporary workspace at http://127.0.0.1:3102 without changing the user's database or shell environment. Review-only seeding holds feed/provider requests for two days and sets automatic refresh to 1440 minutes; this is a short-review safeguard, not a permanent offline mode. The kit was started and smoke-tested: a manual refresh kept all configured feed lastAttempt values unchanged and an uncached CVE lookup returned 429 before networking. The temporary server was stopped afterward. No desktop/browser settings or app security boundaries were weakened.

No schema migration or dependency installation was needed. Seeding was extracted from scripts/prepare-e2e.ts into scripts/seed-e2e.ts for reuse by ordinary tests, restart tests and the manual kit. Existing private data and development port 3000 were not used. Phase 1 remains incomplete; configurable objectives, publisher notice/reuse gates and release security/backup acceptance remain open.

## Previous update verification

- 151 automated tests across 24 Vitest files passed.
- Type checking, lint without warnings and production build passed. Git whitespace verification passed before commit.
- Full 48-test Chrome browser suite passed, including the full application restart scenario, three-width normal reflow matrix, twelve forced-color cases, collapsed-to-mobile labels and existing workflows.
- A final explicit system-color refinement for navigation text and extra in-viewport label assertions were followed by a successful production build, typecheck/lint and all 12 targeted forced-color cases. Updated captured Settings/navigation images were reviewed afterward.
- Agent visual review inspected forced-color captured images for the implemented screens and a normal 640px Command Center rendering. These are artifacts from controlled Chrome emulation, not native Windows screenshots or aural screen-reader evidence.
- Tests initially exposed primary-button author-color issues under forced colors and an incorrect mouse-modality focus assertion; system palette styles and keyboard-mode setup fixed these. New overflow assertions also needed a named Main navigation selector because article pagination is a second navigation landmark.
- Manual kit startup/cooldown checks passed and its server was stopped. No routine test makes live publisher requests, and no personal database was mutated.

Prior hosted CI repair was verified at https://github.com/jamesdoom/gapSound/actions/runs/45652241919 with no annotations. Current update checks ran locally; no new hosted CI result is claimed. Package changes add a local review script only; dependency versions and lockfile remain unchanged. Prior dependency audit reported zero vulnerabilities.

## Persistent briefing/review behavior

New version-2 briefings capture up to 100 unfinished due/overdue reviews plus their total count. Changes appear only after regeneration; older version-1 snapshots remain readable and explicitly say scheduled reviews were not captured. Regeneration/archive/history retain prior contents. Completed review records cannot be rescheduled; create a new record for another attempt. No automatic spaced repetition or notifications. See docs/DAILY_BRIEFINGS.md.

## Remaining limitations and next actions

- GS-007 configurable objective plans and notebook/training workflows are implemented; proceed with broader publisher reuse permissions, native accessibility signoff and tooling maintenance before final release acceptance.
- Full reviewed CVE/CISA notice packaging is implemented. Resolve the remaining broader publisher reuse permissions in docs/SOURCE_POLICIES.md before claiming GS-003 complete or distributing publisher data.
- Complete native screen-reader speech, real browser zoom and Windows contrast-theme review using the isolated manual kit; Computer Use blocked the desktop attempt in this session.
- Backup/restore, secret scanning and dependency/security review are implemented; retain their repeatable commands and resolve the remaining GS-002/003 gates before final release acceptance.
- Plan a compatible ESLint tooling upgrade; the current pinned version has no reported npm advisory but is unsupported.
- Automated and visual-emulation checks do not certify WCAG conformance; native manual signoff remains separate.
- CVE and notebook reads are paginated. Feed refresh lacks a cross-process lock/retry jitter; CVE lookups use persisted leases/cooldowns but no background queue.
- Private study text may appear in retained briefing snapshots and backups. No encryption at rest, undo or secure erasure is provided. Recovery of already completed sessions is not supported.

## Run and verify

Restart the dev server to load this update:

    npm run dev

Migration 0010 has been applied locally; other updated checkouts must run npm run db:migrate before restarting. Normal development remains http://127.0.0.1:3000. For a synthetic manual review workspace, run npm run test:a11y:manual after a production build and open http://127.0.0.1:3102; stop with Ctrl+C. General checks:

    npm test
    npm run typecheck
    npm run lint
    npm run build
    npm run test:e2e

Browser tests use new temporary databases on ports 3100/3101 and can run alongside the user's development server on 3000. Install Playwright Chromium or set PLAYWRIGHT_CHANNEL=chrome. Normal npm works in the user's VS Code terminal; only the restricted agent shell needs the bundled npm CLI fallback. No global configuration changes are required.

Learning question: why do an attribution, a license text and permission to republish represent three different things, and why should a saved snapshot retain the notice captured with it?
