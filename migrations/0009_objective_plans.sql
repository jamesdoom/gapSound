ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0 CHECK(position >= 0);
CREATE TABLE objective_plan (
  id TEXT PRIMARY KEY CHECK(id = 'local'),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  titles TEXT NOT NULL DEFAULT '[]' CHECK(length(titles) <= 10000)
);
INSERT INTO objective_plan (id) VALUES ('local');
CREATE TABLE objective_plan_days (
  day TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  applied_at TEXT NOT NULL
);
