import { spawn } from "node:child_process";
await import("./migrate");
// Migration closes its client. Seed using a separate connection.
const { createClient } = await import("@libsql/client");
const path = (process.env.GAPSOUND_DATA_DIR ?? "").replaceAll("\\", "/");
if (!path) throw new Error("E2E requires an isolated data directory");
const db = createClient({ url: `file:${path}/gapsound.db` });
await db.execute(
  "INSERT INTO sources(id,name,url,last_success) VALUES ('fixture','Demonstration fixture','https://example.com/feed','2026-11-25T12:00:00Z')",
);
await db.execute({
  sql: "INSERT INTO sources(id,name,url,error,consecutive_failures,next_attempt_at) VALUES ('fixture-delay','Demonstration delayed source','https://example.com/delay','Demonstration: HTTP 429',2,?)",
  args: [new Date(Date.now() + 7200000).toISOString()],
});
await db.execute(
  "INSERT INTO articles(id,source_id,title,url,summary,category,published_at,ingested_at) VALUES ('fixture-article','fixture','Demonstration: phishing investigation','https://example.com/demo','Synthetic metadata for automated browser testing.','Phishing','2026-11-25T12:00:00Z','2026-11-25T12:01:00Z')",
);
await db.execute(
  "INSERT INTO vulnerabilities VALUES ('CVE-2099-99999','Fictional Vendor','Demonstration Product','Demonstration vulnerability','Synthetic test fixture, not a real CVE.','Apply fictional remediation.','2099-01-01','2099-02-01','2099-01-01T00:00:00Z')",
);
for (const [id, saved] of [
  ["expired-fixture", 0],
  ["saved-expired-fixture", 1],
] as const) {
  await db.execute({
    sql: "INSERT INTO articles(id,source_id,title,url,summary,category,ingested_at,bookmarked) VALUES (?,'fixture',?,?,'Demonstration only','Research',?,?)",
    args: [
      id,
      "Demonstration: " + id,
      "https://example.com/" + id,
      new Date(Date.now() - 100 * 86400000).toISOString(),
      saved,
    ],
  });
}
await db.execute(
  "INSERT INTO sources(id,name,url) VALUES ('paging','Demonstration pagination fixture','https://example.com/pages')",
);
for (let i = 0; i < 103; i++)
  await db.execute({
    sql: "INSERT INTO articles(id,source_id,title,url,summary,category,ingested_at,published_at) VALUES (?,'paging',?,?,'Synthetic pagination test','Threat intelligence',?,NULL)",
    args: [
      "paging-" + String(i).padStart(3, "0"),
      "Demonstration paging " + String(i).padStart(3, "0"),
      "https://example.com/pages/" + i,
      new Date().toISOString(),
    ],
  });
db.close();
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    process.env.GAPSOUND_PORT || "3100",
  ],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
