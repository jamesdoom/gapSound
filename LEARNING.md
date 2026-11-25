# Security learning notes

## Action runtimes and repeatable CI failures

The Node version used inside a GitHub action is separate from the Node version setup-node installs for application commands. CI now pins official checkout, setup-node and upload-artifact releases that declare Node 24 runtimes, while the app continues testing on Node 22. Immutable commit references reduce exposure to changed release tags. Read-only repository permissions remain in place, and failure artifacts contain only isolated test fixtures.

The reported CI failure was a separate React state-lifetime bug: a key on the Settings section remounted its retention panel when preferences arrived. Moving the key to the preferences form preserves cleanup state. The regression test explicitly delays initial preferences until cleanup is in flight, reproduces the failure without timing sleeps, then verifies the success message survives. Increasing test timeouts would not fix a component that lost its state.

**Question:** Why can changing setup-node's application version fail to remove an action's Node runtime warning?

## Accessible controls support deliberate security decisions

The workspace now moves focus to new screen headings, supports a focusable skip-link destination, labels study progress, explicitly names collapsed navigation and announces successful saves without moving form focus. A keyboard regression test exposed a real class collision: Tailwind's collapse utility hid the navigation toggle. It now uses the distinct nav-toggle class. These changes keep important controls and feedback available without a mouse; they do not change authorization or input validation.

Review `src/components/dashboard.tsx`, `src/app/globals.css` and `e2e/accessibility.spec.ts`. Tests scan all six screens at desktop and 320px widths with axe's default rules, verify reflow, exercise skip/search/navigation by keyboard and check success feedback. Passing these tests is not a WCAG conformance claim: real screen-reader, forced-colors and zoom assessments remain. See docs/ACCESSIBILITY.md.

**Question:** Why can an automated accessibility scan pass even when a hidden but essential control is unusable?

## Making cleanup deliberate and bounded

`src/services/retention.ts` selects only unbookmarked article metadata older than 90 days by ingestion time. Publication dates are untrusted and may describe very old articles that were just imported, so they do not determine eligibility. The browser previews IDs and requires confirmation; the server validates the request, restricts age again, expires old previews and rechecks bookmark state in the DELETE predicate. A bookmark added after preview protects that record. Only previewed IDs can be deleted, up to 400, fitting the API's 32 KiB input budget. `src/app/api/retention/route.ts` applies the same local Host/Origin boundary as other mutations.

`tests/retention.test.ts` covers preview without deletion, exact cutoff boundaries, recent records, saved records, changes after preview, personal record preservation, malformed/stale plans and batching. The browser suite exercises confirmation and original bookmark preservation in a synthetic test database. Actual user data is never cleaned by tests. This is permanent record removal, not secure erasure: SQLite pages and backups can retain deleted data. There is no undo; back up first. Sources may reintroduce content, and free-text research notes retain their original URLs.

**Question:** Why must bookmark eligibility be checked again when deleting, rather than trusted from the preview?

## Respecting rate limits across restarts

`src/lib/feed-retry.ts` accepts Retry-After delay-seconds or HTTP-date syntax, then chooses the later of the provider deadline and a local exponential backoff. `src/services/feeds.ts` stores that deadline and the failure count in SQLite; skipped sources are not fetched, and a successful import resets the count. Migration 0002 preserves existing records. This prevents repeated refresh clicks or app restarts from bypassing a source's waiting period and reduces load during outages. The UI says retry **eligible**, since a fetch happens only on a later refresh while the app is open.

`tests/source-backoff.test.ts` simulates 429/503 failures, independently successful sources, closing/reopening the database, skipping early retries and recovery. `tests/feed-retry.test.ts` covers malformed/past headers, long provider delays and the local 24-hour backoff cap. Provider delays may exceed that cap. Extremely large valid numeric values saturate at year 9999 to avoid timestamp overflow. There is no randomized jitter or cross-process refresh lock yet; run one server.

**Question:** Why must retry eligibility be stored in the database instead of only in a browser timer?

## Closing the DNS validation gap

`src/lib/feed-network.ts` validates all DNS answers and supplies a validated address directly to the HTTPS socket lookup callback. Checking a hostname before calling ordinary fetch would leave a second lookup vulnerable to DNS rebinding. The native HTTPS request retains the source hostname for TLS certificate verification, disables socket reuse, rejects redirects and bounds the entire request. `tests/feed-network.test.ts` covers private/special IPv4/IPv6 destinations, mixed DNS answers, both lookup callback shapes, HTTP errors, oversized bodies and unsupported compression. This is defense in depth, not permission to fetch arbitrary URLs: fixed source allowlisting remains mandatory. Trusted source compromise, workstation compromise and network policy outside the application remain risks.

**Question:** Why must the address validated by the application be the same address used by the socket?

**Independent exercise:** Add deterministic tests for DNS timeouts and responses that stop halfway through a document.

## Atomic intelligence imports

`persistSource` in `src/services/feeds.ts` commits records and the source success timestamp together. A failure rolls back the whole source import; other sources still refresh independently. `tests/ingestion.test.ts` injects a database trigger failure on the second record and proves the first record and new freshness timestamp are rolled back. Existing bookmarks remain preserved by the upsert. Retention and authoritative deletion handling remain future work.

**Question:** What misleading state could appear if the success timestamp committed before all catalog records?

## Protecting localhost APIs

Implemented in `src/lib/security.ts` and `src/app/api/workspace/route.ts`. A malicious website may try to make your browser send requests to a local application, even when the server binds only to loopback. Exact Host validation rejects attacker-controlled DNS names pointing to localhost; Origin and Fetch Metadata validation reject cross-origin requests. Mutation bodies must be JSON and are streamed with a 32KiB cap. Tests in `tests/security.test.ts` exercise trusted origin, cross-origin, originless writes, rebinding hosts and size limits. Local malware or a compromised same-origin script remains outside this defense.

**Question:** Why does binding to 127.0.0.1 fail to replace Origin validation?

**Independent exercise:** Extend a copy of `validateRequest` to support one configurable local port without accepting arbitrary hosts.

## Treating threat intelligence as untrusted input

`src/services/feeds.ts` rejects XML entity declarations, validates catalog shapes, bounds network requests and only fetches fixed configured URLs. `src/lib/security.ts` rejects dangerous article links. React displays metadata and note bodies as text; no `dangerouslySetInnerHTML` is used. `tests/feeds.test.ts` covers malicious XML, unsafe links, deterministic identities and item caps. Text stripping is not a general HTML sanitizer: React escaping supplies the rendering boundary. A trusted-domain DNS compromise remains a residual SSRF risk until DNS pinning is added.

**Question:** Why is a public-looking URL insufficient evidence that a resolved address is public?

**Independent exercise:** Implement and test a pure function that recognizes IPv4 private and documentation ranges before wiring it into outbound networking.

## Persistence invariants

`migrations/0001_foundation.sql` makes article URLs unique and permits only one active session. The API uses parameterized Drizzle operations. `tests/database.test.ts` verifies migration setup, active-session uniqueness, preservation of bookmark state on content updates, and setting constraints. This protects data integrity independently of whether a button is disabled in the browser.

**Question:** Why should a database enforce one active session even if the UI prevents double clicks?
