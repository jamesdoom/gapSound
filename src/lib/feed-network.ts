import { lookup } from "node:dns/promises";
import { request } from "node:https";
import ipaddr from "ipaddr.js";

export function isPublicAddress(address: string): boolean {
  try {
    const ip = ipaddr.parse(address);
    if (ip.range() !== "unicast") return false;
    if (ip.kind() === "ipv6") {
      const v6 = ip as ipaddr.IPv6;
      // Accept only global unicast; exclude documentation and protocol assignments.
      return (
        v6.match(ipaddr.IPv6.parse("2000::"), 3) &&
        !v6.match(ipaddr.IPv6.parse("2001::"), 23) &&
        !v6.match(ipaddr.IPv6.parse("2001:db8::"), 32) &&
        !v6.match(ipaddr.IPv6.parse("3fff::"), 20)
      );
    }
    return true;
  } catch {
    return false;
  }
}

export async function resolvePublicAddress(
  hostname: string,
  resolver = lookup,
) {
  const addresses = await resolver(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some((value) => !isPublicAddress(value.address))
  )
    throw new Error("Source DNS returned a non-public address");
  return addresses[0];
}

export class SourceHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Source returned HTTP ${status}`);
  }
}

// Native HTTPS does not follow redirects. The exact validated DNS answer is used
// as the socket destination; TLS SNI/certificate verification retain the hostname.
export function fetchPublicFeed(
  url: string,
  approved: readonly string[],
  timeoutMs = 15000,
  maxBytes = 10 * 1024 * 1024,
): Promise<string> {
  if (!approved.includes(url))
    return Promise.reject(new Error("Source not approved"));
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== "443")
  )
    return Promise.reject(new Error("Unsafe source URL"));
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const req = request(
      parsed,
      {
        agent: false,
        signal: controller.signal,
        maxHeaderSize: 16384,
        headers: {
          "User-Agent": "GapSound/0.1 personal educational feed reader",
          Accept: "application/json, application/rss+xml, text/xml",
          "Accept-Encoding": "identity",
        },
        lookup(hostname, options, callback) {
          void resolvePublicAddress(hostname).then(
            (address) => {
              if (controller.signal.aborted) return;
              if (options.all) callback(null, [address]);
              else callback(null, address.address, address.family);
            },
            (error) => callback(error, "", 4),
          );
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new SourceHttpError(response.statusCode ?? 0));
          response.destroy();
          return;
        }
        if (
          response.headers["content-encoding"] &&
          response.headers["content-encoding"] !== "identity"
        ) {
          reject(new Error("Unsupported response encoding"));
          response.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            reject(new Error("Source exceeded size limit"));
            response.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
        response.on("error", reject);
        response.on("aborted", () =>
          reject(new Error("Source response interrupted")),
        );
      },
    );
    req.on("error", reject);
    req.on("close", () => clearTimeout(timer));
    req.end();
  });
}
