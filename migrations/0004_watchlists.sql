CREATE TABLE watchlists (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(name) BETWEEN 1 AND 80), created_at TEXT NOT NULL);
CREATE TABLE watchlist_terms (watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE, term TEXT NOT NULL CHECK(length(term) BETWEEN 1 AND 60), PRIMARY KEY(watchlist_id,term));
