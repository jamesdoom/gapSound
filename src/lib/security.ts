export function localEndpoints(port = process.env.GAPSOUND_PORT || "3000") {
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535)
    throw new Error("Invalid local port");
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  return { hosts, origins: hosts.map((host) => `http://${host}`) };
}
export function validateRequest(request: Request) {
  const local = localEndpoints();
  const host = request.headers.get("host");
  if (!host || !local.hosts.includes(host)) throw new Error("Untrusted host");
  const origin = request.headers.get("origin");
  if (origin && !local.origins.includes(origin))
    throw new Error("Untrusted origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    throw new Error("Cross-origin request blocked");
  if (request.method !== "GET" && !origin) throw new Error("Origin required");
}
export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (
      !host.includes(".") ||
      /^[\d.]+$/.test(host) ||
      host.includes(":") ||
      /\.(local|localhost|internal)$/.test(host)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
export async function boundedJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("Expected JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 32768) throw new Error("Body too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
