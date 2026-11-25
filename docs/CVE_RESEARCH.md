# Vulnerability research

CVE Watchtower combines stored CISA KEV entries and manually retrieved CVE Program records, deduplicated by identifier. Browsing/search/filter/save operations are local. Results use pages of 20 instead of the former 100-item cap. Search matches literal stored metadata, including products/descriptions; Vendor contains matches literal vendor substrings with English case ignored. Severity filters use the selected stored assessment; UNKNOWN includes KEV-only records and records without supported scores. Saving/unsaving changes a separate local marker and never deletes research data or makes a network request.

## Authoritative lookup and provenance

**Look up CVE** accepts a syntactically validated identifier only (CVE, four-digit year and a 4–19-digit number). The server constructs one fixed HTTPS destination: https://cveawg.mitre.org/api/cve/{ID}. It does not accept URLs. The official [CVE Services route](https://raw.githubusercontent.com/CVEProject/cve-services/dev/src/controller/cve.controller/index.js) documents public single-record access for published/rejected records. The [official CVE record format](https://github.com/CVEProject/cve-schema) and [CVE repository](https://github.com/CVEProject/cvelistV5) describe CNA and ADP containers. References from both are retained, deduplicated and restricted to safe HTTPS links; references are never fetched by the server.

The app validates the envelope/identifier/state and a bounded projection, not every constraint in the full upstream JSON schema. It accepts CVE 5.x data versions and preserves English descriptions preferentially (otherwise the first supplied language is labeled). It stores source publication/modification dates only when timezone evidence is available. Missing fields remain unknown. REJECTED records display an explicit warning and rejection reason, with no inherited affected-product/severity claims.

Supported assessments are provider-reported CVSS 4.0, 3.1 and 3.0 base scores. Selection prefers CNA over ADP, then version 4.0 → 3.1 → 3.0, then original order within a version. All retained assessments show provider/container/version and vector if supplied. This is a deterministic display choice, not a maximum-risk ranking or independent score calculation. Qualitative bands use reported scores: 0 NONE, 0.1–3.9 LOW, 4.0–6.9 MEDIUM, 7.0–8.9 HIGH, 9.0–10 CRITICAL. See FIRST's [v3.1](https://www.first.org/cvss/v3.1/specification-document) and [v4.0](https://www.first.org/cvss/v4.0/specification-document) specifications. Missing/unsupported/invalid scores are UNKNOWN, never zero. CVSS v2 is not displayed as a supported assessment.

CNA affected-product/version metadata is copied with reported status/range bounds and default status. Additional version-status changes are explicitly flagged for source review. The app does not evaluate versions against an installation. CWE identifiers and source references are displayed when available. NVD and EPSS enrichment remain planned; no new Phase 2 work was added.

## Unknowns, freshness and failure

- A local KEV match means evidence in the stored CISA catalog. No match means exploitation status is unknown. Catalog freshness/errors and record ingestion times are visible. Severity does not establish exploitation or user exposure.
- Successful CVE records remain browsable offline, with fetch/attempt times and a stale-data reminder. A failed refresh retains the previous snapshot and saved marker, alongside the latest error.
- An HTTP 404 says no public record was returned; it may be unpublished, reserved or unknown. It does not prove the identifier is nonexistent. Entries without a validated record or KEV evidence cannot be newly saved.
- Lookup failures, malformed responses and unavailable descriptions/scores/vendors/dates are displayed explicitly. No synthetic live data is generated.

## Network/resource limits

Manual lookups reuse successful records for 24 hours unless **Refresh CVE record** is selected. A persisted 15-minute per-ID attempt cooldown still applies. A global persisted lease blocks overlapping lookups for 30 seconds while a request is pending; completion sets a six-second minimum provider spacing from request start. HTTP failures use exponential 15-minute-to-24-hour backoff and respect a longer Retry-After. A 404 uses the per-ID cooldown without imposing failure backoff on other IDs. Restarting does not clear persisted cooldowns. There are no in-request retries or background CVE polling.

Transport reuses public-DNS checking/address pinning, TLS hostname validation, no redirects and a 15-second/2-MiB body limit. The lookup cache is capped at 5,000 identifiers, including failed attempts; existing KEV entries are preserved separately. Display projections bound affected products/versions, metrics, CWE IDs and references (up to 20 each, with up to 20 versions per product). Text lengths are bounded and normalized snapshots are reduced below 180,000 characters; truncation is flagged with a link to the full CVE record. Text is escaped by React, with no raw HTML/media or executable content. All mutations require the existing local Host/Origin boundary and bounded JSON.

These conservative application limits are not claims about a published provider quota or service agreement. The [official repository](https://github.com/CVEProject/cvelistV5) links to [CVE Terms of Use](https://www.cve.org/Legal/TermsOfUse). The dated publisher review is recorded in [SOURCE_POLICIES.md](SOURCE_POLICIES.md). GS-003 retains unresolved reuse/notice packaging gates; endpoint/format verification is not legal compliance or an availability guarantee.

## Persistence and checks

Migration 0008 adds cve_records, vulnerability_saves, cve_lookup_state and a severity index without rewriting the CISA catalog or personal records. Snapshot replacement and provider-state updates are transactional. Claims/cooldowns are persisted before network activity. Unsave preserves data; there is no automatic eviction or removal of personal research. Pagination count/items are separate reads and may briefly differ during concurrent changes.

Tests inject provider fixtures for success, 404, 429/Retry-After, malformed/mismatched records, missing fields, zero scores, rejected records, provenance/selection, projection limits, rollback, reconnect persistence and combined paging/filtering beyond 100 records. Browser tests use labeled synthetic fixtures and a real cached API lookup, with no live provider calls. A separate read-only smoke request successfully fetched/normalized CVE-2021-44228 through the production transport without database writes; it was not saved as a user lookup.
