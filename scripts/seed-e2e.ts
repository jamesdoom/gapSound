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
  "INSERT INTO articles(id,source_id,title,url,summary,category,published_at,ingested_at) VALUES ('fixture-article','fixture','Demonstration: phishing investigation','https://example.com/demo','Synthetic metadata for automated browser testing: CVE-2099-99999 and CVE-2099-11111.','Phishing','2026-11-25T12:00:00Z','2026-11-25T12:01:00Z')",
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
await db.execute(
  "UPDATE articles SET publisher_notice='Synthetic publisher notice retained for tests.' WHERE id='fixture-article'",
);
// Explicitly synthetic CVE fixtures; no provider calls are made by browser setup.
const { normalizeCve } = await import("../src/services/cve-normalization");
const { demonstrationCve } = await import("../tests/fixtures/cve-record");
for (const id of ["CVE-2099-99999", "CVE-2099-77777"]) {
  const source = demonstrationCve(id);
  if (id.endsWith("77777")) {
    source.containers.cna.metrics = [];
    source.containers.adp = [];
    source.containers.cna.affected = [];
    source.containers.cna.title = "Demonstration unknown severity";
  }
  const snapshot = normalizeCve(source, id);
  await db.execute({
    sql: "INSERT INTO cve_records(id,snapshot,severity,vendor_text,last_success,last_attempt,outcome) VALUES (?,?,?,?,?,?,'ok')",
    args: [
      id,
      JSON.stringify(snapshot),
      snapshot.metrics[0]?.severity ?? "UNKNOWN",
      snapshot.affected.map((a) => a.vendor ?? "").join("\n"),
      new Date().toISOString(),
      new Date().toISOString(),
    ],
  });
}
await db.execute(
  "INSERT INTO cve_records(id,outcome,error) VALUES ('CVE-2099-66666','error','Demonstration provider unavailable; no source record is stored.')",
);
for (let i = 0; i < 103; i++)
  await db.execute({
    sql: "INSERT INTO vulnerabilities(id,vendor,product,name,description,action,added_at,due_date,ingested_at) VALUES (?,?,?,?,?,?,?,?,?)",
    args: [
      "CVE-2099-" + (20000 + i),
      i % 2 ? "Odd Demo Vendor" : "Even Demo Vendor",
      "Synthetic Product",
      "Demonstration paging vulnerability " + i,
      "Synthetic browser fixture; no live threat claim.",
      "Demonstration action",
      "2099-01-01",
      "2099-01-02",
      new Date().toISOString(),
    ],
  });
// Prevent unintended live CVE calls from synthetic browser fixtures; cached lookups still work.
await db.execute({
  sql: "UPDATE cve_lookup_state SET next_attempt_at=? WHERE id='local'",
  args: [new Date(Date.now() + 7200000).toISOString()],
});
if (process.env.GAPSOUND_MANUAL_REVIEW === "1") {
  const { feedSources } = await import("../src/services/feeds");
  const deadline = new Date(Date.now() + 2 * 86400000).toISOString();
  for (const source of feedSources)
    await db.execute({
      sql: "INSERT INTO sources(id,name,url,last_attempt,next_attempt_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_attempt=excluded.last_attempt,next_attempt_at=excluded.next_attempt_at",
      args: [
        source.id,
        source.name,
        source.url,
        new Date().toISOString(),
        deadline,
      ],
    });
  await db.execute("UPDATE settings SET refresh_minutes=1440 WHERE id='local'");
  await db.execute({
    sql: "UPDATE cve_lookup_state SET next_attempt_at=? WHERE id='local'",
    args: [deadline],
  });
}
db.close();

export {};
