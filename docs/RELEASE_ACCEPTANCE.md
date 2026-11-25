# Phase 1 release acceptance — November 25, 2026

This is a local development acceptance record, not approval for public deployment or redistribution. Phase 1 remains incomplete: broader publisher reuse permissions and native screen-reader/zoom/contrast-theme signoff remain open. Full reviewed CVE/CISA notice packaging was added in migration 0010; see PUBLISHER_NOTICES.md. Configurable objective plans were completed in the subsequent migration-0009 update; see HANDOFF.md for current checks. See TASKS.md and docs/SOURCE_POLICIES.md.

## Backup and recovery

From the repository terminal, create a **new directory** for each backup:

```powershell
npm run db:backup -- data/backups/2026-11-25-first
```

The source is `gapsound.db` under `GAPSOUND_DATA_DIR` (default `data`). SQLite `VACUUM INTO` takes a consistent snapshot including committed WAL data; do not copy a live database file alone. The command verifies SQLite integrity, foreign keys and migration history, then writes `manifest.json` with SHA-256, UTC timestamp and migration IDs. New backups also include publisher-notices.json with a manifest SHA-256; restore verifies and copies it when present. Older manifests without that optional field remain readable. The bundle contains the entire database: notes, settings, saved intelligence, briefings and training history. It does not include source code, dependency files or environment configuration. Keep the corresponding Git revision available. [SQLite documents the snapshot behavior and interrupted-output limitation](https://sqlite.org/lang_vacuum.html).

Restore into another **new directory**, preserving both the original and backup:

```powershell
npm run db:restore -- data/backups/2026-11-25-first data/recovered-2026-11-25
```

Restore copies the snapshot exclusively, verifies its checksum and checks integrity, foreign keys and matching migration IDs. Neither command overwrites an existing destination directory. Failed operations can leave incomplete output: never start the app against a directory from a failed command. Choose a fresh directory when retrying. Only restore trusted backups made by this application; the checksum detects accidental changes, not a maliciously replaced database and manifest. This is not a signature, encryption or arbitrary-database safety guarantee. Use the same application revision initially; do not open a newer schema with older code.

To inspect recovery, stop your existing dev server with Ctrl+C, then in that terminal:

```powershell
$env:GAPSOUND_DATA_DIR = (Resolve-Path data/recovered-2026-11-25).Path
npm run dev
```

Verify your notes, bookmarks, sessions and briefings at http://127.0.0.1:3000. To return to the default database, stop the server, run `Remove-Item Env:GAPSOUND_DATA_DIR`, then `npm run dev`. If you previously used a custom data directory, restore that value instead. Do not replace or delete your original database. Move a verified backup bundle to private storage outside the workstation for protection against disk loss; that transfer is not automated or tested here. Files are unencrypted; Windows directory ACLs are inherited. The local `data/` tree is Git-ignored; keep externally selected backup directories outside the repository or explicitly ignored.

Verification uses synthetic temporary databases, not the user's private database. Unit coverage exercises live WAL writes, a subsequent edit excluded from the snapshot, checksum rejection, missing migration history, orphan foreign keys, malformed manifests and refusal to overwrite backup/restore targets. The browser restart scenario restores a complete API-written workspace into a new directory and boots the actual production Next.js process against it. This verifies usability, not only a file copy. No personal recovery or off-device recovery has been performed.

## Secret scanning

```powershell
npm run security:secrets
```

Downloads official Gitleaks 8.30.1 for Windows/Linux x64, checks a hard-coded release SHA-256, scans all available Git history and a temporary copy of tracked/non-ignored workspace files. Output uses 100% redaction. No allowlists were added. Ignored databases, `.env` files, dependencies and browser artifacts are outside this repository scan; do not infer that private local files or remote-only refs were scanned. CI fetches full history and runs the same scanner before installation. GitHub/network availability is required; download/checksum/scan failure fails the command. Temporary scan copies remain in the OS temp directory and inherit local access controls.

Local history and workspace scans passed with no findings. A generated high-entropy synthetic credential was detected in an isolated negative-control file, and its value was absent from captured output. An initial repeated-character probe was below scanner entropy criteria; it was replaced with the high-entropy probe. Pattern scanners do not prove absence of every secret.

## Dependency review

Top-level dependencies are pinned to the exact versions already resolved in the lockfile; no package versions were upgraded. Of 682 lockfile package entries, 676 have registry.npmjs.org resolution URLs and integrity metadata. The other six are explicitly bundled within the integrity-pinned optional Tailwind oxide WASI archive; they have no separate download. Platform-specific optional packages account for the difference from the 558 packages reported by the Windows install audit. The two lockfile install-script declarations are esbuild 0.28.2 (platform binary setup) and optional macOS fsevents 2.3.3; isolated installation used `npm ci --ignore-scripts`. Build/tests subsequently exercise the installed Windows toolchain. CI retains ordinary `npm ci` for cross-platform package setup.

The fresh npm audit reported zero known vulnerabilities. This is a registry advisory check, not a package code audit. The isolated clean install passed. A workspace clean install initially failed because Windows held native modules open; `npm install --ignore-scripts` repaired the workspace without stopping the user's server, reporting only locked stale-directory cleanup warnings. No global npm configuration changed. npm warns that ESLint 9.39.5 is unsupported; plan a separately verified tooling upgrade rather than assuming the absence of advisories means active support.

License metadata was reviewed: MIT/ISC/BSD/Apache and other notices coexist with MPL-2.0 (axe/lightningcss), LGPL-3.0-or-later (optional sharp/libvips platform packages) and CC-BY-4.0 (caniuse-lite). Preserve upstream licenses/notices and assess binary/source obligations before distributing packaged artifacts. No redistributable bundle or third-party notice clearance is claimed. Publisher data rights are separate and remain gated by docs/SOURCE_POLICIES.md.

## Security and workflow review

Reviewed exact local Host/Origin/Fetch Metadata checks, JSON input bounds, fixed-source DNS-pinned transport, safe links/Markdown, production CSP, migration transactions and read-only versus mutation routes. No source-code raw HTML sink, input-driven shell execution or new remote endpoint was introduced. Backup operations are terminal-only; no filesystem control API was added. CI actions remain SHA-pinned with read-only contents permission. Existing security and malicious-content regressions remain part of the complete test suites.

Residual risks in SECURITY.md still apply: unencrypted local files/backups, trusted workstation/extensions, inline Next.js bootstrap CSP, pending streaming deadlines/write rate limits and cross-process feed locking. This review is not an independent penetration test. Public deployment and Phase 2 remain unauthorized. Exact final check counts and any failures are recorded in HANDOFF.md.
