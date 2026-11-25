CREATE TABLE cve_records (id TEXT PRIMARY KEY, snapshot TEXT CHECK(snapshot IS NULL OR length(snapshot)<=200000), severity TEXT NOT NULL DEFAULT 'UNKNOWN', vendor_text TEXT NOT NULL DEFAULT '', last_success TEXT, last_attempt TEXT, next_attempt_at TEXT, outcome TEXT, error TEXT);
CREATE TABLE vulnerability_saves (id TEXT PRIMARY KEY, saved_at TEXT NOT NULL);
CREATE TABLE cve_lookup_state (id TEXT PRIMARY KEY, next_attempt_at TEXT, consecutive_failures INTEGER NOT NULL DEFAULT 0);
INSERT INTO cve_lookup_state(id) VALUES ('local');
CREATE INDEX cve_records_severity ON cve_records(severity,id);
