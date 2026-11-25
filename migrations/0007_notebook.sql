ALTER TABLE notes ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN updated_at TEXT;
CREATE INDEX notes_history ON notes(created_at,id);
CREATE TABLE note_tags (note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, tag TEXT NOT NULL, PRIMARY KEY(note_id,tag));
CREATE INDEX note_tags_tag ON note_tags(tag,note_id);
WITH RECURSIVE split(note_id,rest,tag) AS (SELECT id,tags||',','' FROM notes UNION ALL SELECT note_id,substr(rest,instr(rest,',')+1),lower(trim(substr(rest,1,instr(rest,',')-1))) FROM split WHERE rest <> '') INSERT OR IGNORE INTO note_tags(note_id,tag) SELECT note_id,tag FROM split WHERE tag <> '';
