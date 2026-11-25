CREATE INDEX IF NOT EXISTS articles_retention ON articles(bookmarked, ingested_at, id);
