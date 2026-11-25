# Feed normalization contract

`src/services/feed-normalization.ts` converts untrusted XML into bounded article metadata. It performs no network access. The existing transport still restricts retrieval to configured HTTPS sources, pins public DNS answers, rejects redirects and limits total request time and bytes.

## Formats and fields

| Format      | Identity                                                       | Title/summary                                | Publication time                             |
| ----------- | -------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| RSS 2.x     | Safe HTTPS item link; explicit permalink GUID only as fallback | Title and optional description               | Item pubDate; Dublin Core date fallback      |
| RSS 1.0/RDF | Safe HTTPS item link                                           | Title and optional description               | Dublin Core date                             |
| Atom        | Alternate link preferring HTML, never self/enclosure link      | Text or escaped-HTML title; optional summary | published only; updated is never substituted |

Source inspection on November 25, 2026 confirmed RSS shapes for SANS ISC, KrebsOnSecurity and BleepingComputer. SANS descriptions are optional. WordPress content:encoded is deliberately ignored, as is Atom content: only summary metadata is retained. Atom/RDF support is tested with synthetic fixtures; no new sources were added to the allowlist. Arbitrary XHTML text constructs and XML base inheritance are not supported.

Titles retain numeric text, are entity-decoded and bounded to 500 characters; summaries are bounded to 1,500. Known HTML entities and numeric references are decoded for at most two passes. Script/style/template blocks and markup are removed; React escaping remains the rendering boundary. This is plain-text normalization, not a general HTML sanitizer.

RSS RFC-style dates require an explicit timezone, valid calendar date and time. ISO dates require timezone-bearing date-times. Missing, invalid or ambiguous publication dates stay unknown rather than becoming ingestion or modification timestamps. Stored event dates remain UTC; UI display remains local.

## Bounds and failure behavior

- At most 10 MiB of XML and 32 nested XML elements are accepted.
- DTDs and custom XML entity declarations are rejected; parser entity expansion remains disabled.
- At most the first 100 feed entries are examined. Canonical safe URL duplicates within that batch keep their first usable metadata.
- Relative links resolve against the configured source URL; feed-supplied XML base values do not change that base. Links are never fetched by normalization.
- Unsupported documents, malformed XML and nonempty feeds with no usable entries fail. A recognized feed with no entries can succeed without erasing stored articles.
- Each source import is transactional. Failure preserves content and last-success time, records a retry delay and does not stop independent sources.
- Upserts preserve bookmarks, read state, stable IDs for unchanged URLs and first-ingestion timestamps. The source ID tracks the feed supplying the latest metadata. Corrected URLs can produce new identities; existing records are not destructively rewritten or backfilled.

## Evidence and references

Synthetic fixtures under `tests/fixtures/feeds` model observed source fields without copying publisher articles. Tests cover field conversion, timestamps, formats, unsafe content, URL deduplication, parser bounds, source isolation and state preservation. A separate live smoke check normalized 10 SANS, 10 Krebs and 15 BleepingComputer entries, all with valid publication dates, without database writes. Source availability and terms remain separate concerns; GS-003 policy review is still open.

Primary format references: [RSS 2.0](https://www.rssboard.org/rss-specification) and [Atom RFC 4287](https://www.rfc-editor.org/rfc/rfc4287).

Publisher notice retention (migration 0010): recognized channel/item copyright, namespace-stripped rights and text license fields are deduplicated into plain-text publisherNotice metadata. The combined notice is limited to 5,000 characters; oversized or unsupported structured fields reject that source import instead of clipping notices. Missing notices on refresh preserve the last stored notice. This does not infer rights or reconstruct omitted legacy notices; see [publisher notice scope](PUBLISHER_NOTICES.md).
