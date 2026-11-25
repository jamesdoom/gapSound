# Security learning notes

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
