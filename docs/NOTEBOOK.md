# Research notebook

Create or edit a note in Research Notebook. The workspace search matches title, Markdown source and tag text literally (English case ignored); percent/underscore characters are not SQL wildcards. Results use stable creation-time/ID ordering and pages of 20 with a matching count. Editing preserves the creation time, records a UTC edit time and increments a revision. A stale save receives a conflict and leaves the draft in the editor; the list refreshes so you can cancel the draft and reopen the latest record. Finish or cancel a draft before switching notes. Drafts survive filtering and refresh within the notebook, but are not persisted when navigating away or closing the page.

Tags are comma-separated. On save, whitespace is trimmed, English letters lowercased and duplicates removed. Up to 20 tags of 40 characters each are accepted, within a 500-character field. Edit a note's tags to organize it, select an exact tag from the menu or click a tag on a note to filter. The menu shows the 100 most-used tags with notebook-wide counts. Empty tags mean an untagged note. No global tag rename/delete is provided.

## Export

- **Export Markdown** preserves one note's source with title/tags.
- **Export JSON page** downloads exactly the currently displayed page.
- **Export all matching JSON** fetches batches of 20 using a creation-time/ID cursor until all matches have been collected. It follows the search/tag filters, not the current UI page, and reaches records beyond the former 100-note cap. New notes created after export begins are excluded. Export is a live read across batches, not a database snapshot: edits or tag changes during export can change membership/content. Avoid editing during export if you need a consistent result.
- Full JSON downloads are limited to 10,000 notes and 10 MiB of final UTF-8 JSON. Exceeding a limit fails visibly without downloading a partial file; narrow the filters or download individual pages. New note creation is capped at 10,000 records. No automatic deletion occurs. Exports include private note text and revision/timestamp metadata and are not encrypted.

## Markdown boundary

The project-local react-markdown renderer supports CommonMark text, emphasis, headings, lists, quotes and code. It constructs React elements without raw HTML injection or HTML plugins. HTML remains inert text. Images become a text label and do not load; only validated absolute HTTPS links are clickable, with noreferrer/noopener. Relative URLs, unsafe schemes and local/internal URL forms are disabled. Heading levels are adapted to the notebook/preview hierarchy. Rendering is bounded to 20,000 characters per note. No syntax execution, remote media, AI calls or reference fetching occurs. Source exports preserve the original Markdown/HTML text; they are not sanitized HTML documents. See the upstream [renderer security guidance](https://github.com/remarkjs/react-markdown#security).

## Storage and verification

Migration 0007 adds note revisions/edit times, a history index and a normalized note_tags index. It backfills comma-separated legacy tags without rewriting the original note text or timestamps. Existing notes are not deleted. Note content and tag-index updates are transactional; injected-failure tests check rollback. All writes validate bounded JSON and the local Host/Origin boundary. Database operations use parameters. Listing count/items/tag counts are separate reads and may briefly differ during concurrent writes; refresh to reconcile.

Tests cover migration preservation, edits/conflicts, validation, exact tag matching, literal search, pagination/cursor export beyond 100 records, transactional rollback and malicious Markdown. Browser checks exercise editing/reload, normalized tags, filtering, exported JSON contents, stale-draft preservation, mobile accessibility and request boundaries using isolated fixtures. This is not a complete backup/restore feature.
