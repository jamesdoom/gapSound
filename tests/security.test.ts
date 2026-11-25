import { describe, expect, it } from "vitest";
import {
  boundedJson,
  plainText,
  safeUrl,
  validateRequest,
} from "../src/lib/security";
describe("local request boundary", () => {
  const request = (host: string, origin?: string, method = "POST") =>
    new Request("http://127.0.0.1:3000/api/workspace", {
      method,
      headers: { host, ...(origin ? { origin } : {}) },
    });
  it("accepts the configured local origin", () =>
    expect(() =>
      validateRequest(request("127.0.0.1:3000", "http://127.0.0.1:3000")),
    ).not.toThrow());
  it("rejects DNS rebinding hosts", () =>
    expect(() =>
      validateRequest(
        request("attacker.example:3000", "http://attacker.example:3000"),
      ),
    ).toThrow());
  it("rejects cross-origin writes", () =>
    expect(() =>
      validateRequest(request("localhost:3000", "https://attacker.example")),
    ).toThrow());
  it("rejects originless writes", () =>
    expect(() => validateRequest(request("localhost:3000"))).toThrow());
  it("allows local reads", () =>
    expect(() =>
      validateRequest(request("localhost:3000", undefined, "GET")),
    ).not.toThrow());
  it("rejects oversized JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(33000) }),
    });
    await expect(boundedJson(req)).rejects.toThrow("Body too large");
  });
});
describe("external content", () => {
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://metadata.internal",
    "https://user:pass@example.com",
  ])("rejects unsafe article link %s", (value) =>
    expect(safeUrl(value)).toBeNull(),
  );
  it("accepts public HTTPS links", () =>
    expect(safeUrl("https://example.com/article")).toBe(
      "https://example.com/article",
    ));
  it("converts markup to text, with React responsible for escaping output", () =>
    expect(plainText("<img src=x onerror=alert(1)>hello <b>world</b>")).toBe(
      "hello world",
    ));
});
