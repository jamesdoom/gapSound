import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.GAPSOUND_DATA_DIR = mkdtempSync(
  join(tmpdir(), "gapsound-manual-a11y-"),
);
process.env.GAPSOUND_PORT = "3102";
process.env.GAPSOUND_MANUAL_REVIEW = "1";
console.log(
  "Manual accessibility fixture: http://127.0.0.1:3102 — synthetic temporary data only. Source requests are held by a two-day cooldown. Press Ctrl+C to stop.",
);
await import("./prepare-e2e");
