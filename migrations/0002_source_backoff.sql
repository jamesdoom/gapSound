ALTER TABLE sources ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK(consecutive_failures BETWEEN 0 AND 32);
ALTER TABLE sources ADD COLUMN next_attempt_at TEXT;
