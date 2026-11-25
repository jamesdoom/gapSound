# Security policy and threat model

This development version is for one trusted user on localhost only. Report issues privately to the repository owner; no dedicated disclosure address has been configured. Do not submit sensitive data in public issues.

## Assets and trust boundaries

Assets: research notes, learning records, saved intelligence and local database. Boundaries: untrusted browser requests → API; public feed content → parser/database; database → React; workstation → external publishers. There are no API keys or AI services in this release.

| Threat                                  | Defense                                                                                                                     | Residual risk                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| CSRF and local DNS rebinding            | Exact Host and Origin checks on API, Fetch Metadata checks, JSON writes require Origin; localhost-only scripts              | No protection against malicious same-origin scripts, browser extensions or local processes                           |
| Stored XSS and malicious feed markup    | React escaping, plain-text feed metadata, unsafe URL rejection, no raw HTML or remote media                                 | No rich Markdown yet; unsafe-inline remains necessary for initial Next bootstrap CSP                                 |
| SSRF and unsafe redirects               | Fixed HTTPS source allowlist, no arbitrary URLs, redirect rejection, 15s timeout, 10MiB response cap                        | DNS pinning and resolved-private-IP rejection are pending; trusted-domain DNS/host compromise is not fully mitigated |
| Injection and malformed inputs          | Drizzle parameterization, Zod boundaries, XML entity/DTD rejection, bounded item count                                      | Parser/library defects remain possible; no independent security audit                                                |
| Resource exhaustion and source overload | 32KiB input limit, bounded query results, one refresh at a time, persistent 15-minute cooldown, sequential network requests | Local write rate limits and stricter body streaming deadlines remain pending                                         |
| Accidental exposure and secret leakage  | No default external bind, ignored env/database, no paid AI calls, fixed error messages, no input logging                    | Files unencrypted at rest; workstation user can read data                                                            |

Security headers include nosniff, DENY framing, no-referrer, restrictive permissions and CSP with no external scripts, images or connections. CSP allows inline scripts/styles for Next; nonce-based policy is pending. Do not weaken boundaries to make tests pass.

Feed URLs are configured in code, never supplied by user input. Article links are not fetched by the server. Publishers receive refresh requests; users can choose whether to open original articles in their browser. Notes are never sent to any AI provider.

Tests cover local origin/host rules, oversized JSON, unsafe link schemes, malicious XML declarations, normalization and database constraints. Passing tests is not a security certification. Dependency auditing is part of CI; dedicated secret scanning, browser regression testing, DNS pinning and backup/restore validation are outstanding. Public hosting needs reviewed authentication, authorization, sessions, HTTPS and deployment controls before implementation.
