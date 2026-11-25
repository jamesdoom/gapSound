CREATE TABLE scheduled_reviews (id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200), due_day TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT);
CREATE INDEX scheduled_reviews_due ON scheduled_reviews(completed_at, due_day, id);
