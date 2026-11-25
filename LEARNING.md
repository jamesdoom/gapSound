# Security learning notes

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
