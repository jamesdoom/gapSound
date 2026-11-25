import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  lstatSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// Official release archives, SHA-256 values verified against release checksums.
const version = "8.30.1";
const windows = process.platform === "win32";
if (process.arch !== "x64" || !["win32", "linux"].includes(process.platform))
  throw new Error("Secret scanner supports Windows/Linux x64");
const archive = `gitleaks_${version}_${windows ? "windows_x64.zip" : "linux_x64.tar.gz"}`;
const expected = windows
  ? "d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e"
  : "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb";
const work = mkdtempSync(join(tmpdir(), "gapsound-secrets-"));
const response = await fetch(
  `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${archive}`,
  { signal: AbortSignal.timeout(60000) },
);
if (!response.ok) throw new Error("Scanner download failed");
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== expected)
  throw new Error("Scanner checksum mismatch");
const archivePath = join(work, archive);
writeFileSync(archivePath, bytes);
if (windows)
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $env:GAPSOUND_SCAN_ARCHIVE -DestinationPath $env:GAPSOUND_SCAN_WORK",
    ],
    {
      windowsHide: true,
      env: {
        ...process.env,
        GAPSOUND_SCAN_ARCHIVE: archivePath,
        GAPSOUND_SCAN_WORK: work,
      },
    },
  );
else execFileSync("tar", ["-xzf", archivePath, "-C", work]);
const scanner = join(work, windows ? "gitleaks.exe" : "gitleaks");
const run = (args) =>
  execFileSync(scanner, [...args, "--redact=100", "--no-banner"], {
    stdio: "inherit",
    windowsHide: true,
  });
run(["git", "--log-opts=--all"]);
const snapshot = join(work, "workspace");
mkdirSync(snapshot);
const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
for (const file of new Set(files)) {
  const source = resolve(file);
  // Do not follow symlinks or include ignored personal databases/environment files.
  if (!lstatSync(source).isFile())
    throw new Error("Unexpected non-file in repository scan");
  const target = join(snapshot, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
run(["dir", snapshot]);
console.log(
  `Scanned Git history and ${files.length} non-ignored workspace files. No values are printed on findings.`,
);
