# Saved daily briefings

The Command Center's **Generate today’s briefing** action creates a versioned SQLite snapshot. It makes no AI call or external request. Refresh sources separately, then regenerate if you want newer intelligence. GET requests only read records; changing article search, pagination or filters never regenerates the briefing.

## Content and selection

- News candidates have known publication times within the previous seven days and no later than generation time. Up to 200 candidates are considered; three are selected. Literal watchlist matches score 10 per matched term (up to five), bookmarks score five, and ties use publication date/ID order. Source names, original URLs and publication dates are saved with bounded summaries.
- Up to three CISA KEV additions are selected by their catalog addition dates within the corresponding UTC date window. Catalog inclusion is evidence of known exploitation, not disclosure time or proof that the user's system is exposed.
- The leading news item becomes a source-backed investigation prompt, with instructions to separate supported attack-vector evidence from unknowns. No attack details are generated.
- A curated learning focus, official CISA link and short assessment with a revealable answer remain useful without AI.
- Today's stored objectives and up to three recently completed objectives are captured. Review prompts are suggestions, **not scheduled due dates**. Spaced-repetition scheduling is not implemented in Phase 1.
- Source status is captured at generation: fresh, stale, error or missing. Freshness uses twice the larger of the configured refresh interval and the source minimum (60 minutes for SANS, 15 for other configured feeds). Coverage is explicitly incomplete; missing records do not establish that no events occurred.

## Persistence and history

Migration 0005 adds daily_briefings, a partial unique index allowing one unarchived version per calendar day, and a history index. Each record stores a validated snapshot (version 1 historically, version 2 for new generations), local day, IANA time zone, UTC creation time and optional UTC archive time. Generation validates that the supplied day is today's date in that time zone. Regeneration archives the previous active version and inserts the replacement in one transaction. Failure rolls back both operations. History includes all saved versions in pages of ten.

Archived snapshots remain readable even if source metadata changes or old articles are cleaned up. Their source health and objectives describe generation time. They are not live views. Earlier days remain available in history; there is no automatic snapshot deletion. Snapshots may contain study objectives and source metadata, so keep database backups private. They are bounded to 200,000 stored characters; history page requests are capped at 10,000.

## Boundaries and tests

Snapshot schemas validate references before storage and again when read. Rendering uses React text escaping; no raw HTML, arbitrary URL retrieval, code execution or model tools are added. The briefing API enforces the existing local Host/Origin and bounded JSON rules. A forged historical-day generation request is rejected rather than presented as an authentic past briefing.

`tests/briefings.test.ts` covers relevance, date windows, source states, current-day validation, empty data, immutable content, regeneration, archive/history and database reopen persistence. Browser tests cover generation/reload, filter independence, regeneration/archive/viewing history, assessment reveal, narrow-screen accessibility and hostile-origin rejection. Manual assistive-technology checks and full application process-restart testing remain separate backlog work.

## Manually scheduled reviews

Daily Training → Scheduled reviews creates a topic with a local due date. Pending records can be rescheduled or marked reviewed. Completion uses a UTC timestamp and is retained; schedule a new record for the next attempt. There are no background notifications or adaptive scheduling. Lists use pages of 20 with a 10,000-record cap.

Migration 0006 adds scheduled_reviews. New briefing snapshot version 2 captures up to 100 unfinished reviews due on or before the generation day, oldest due first, plus the total due count. Upcoming/completed reviews are excluded. Changes appear only after regeneration. Version 1 snapshots remain readable and explicitly state that scheduled reviews were not captured. Stored objective prompts remain separate suggestions.
