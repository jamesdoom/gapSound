CREATE TABLE daily_briefings (id TEXT PRIMARY KEY, day TEXT NOT NULL, created_at TEXT NOT NULL, archived_at TEXT, snapshot TEXT NOT NULL CHECK(length(snapshot) <= 200000));
CREATE UNIQUE INDEX one_active_briefing_per_day ON daily_briefings(day) WHERE archived_at IS NULL;
CREATE INDEX briefing_history ON daily_briefings(created_at, id);
