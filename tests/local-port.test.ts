import { afterEach, expect, it, vi } from "vitest";
import { localEndpoints, validateRequest } from "../src/lib/security";
afterEach(() => vi.unstubAllEnvs());
it("keeps configured ports restricted to exact loopback hosts", () => {
  vi.stubEnv("GAPSOUND_PORT", "3100");
  expect(localEndpoints().hosts).toEqual(["127.0.0.1:3100", "localhost:3100"]);
  expect(() =>
    validateRequest(
      new Request("http://127.0.0.1:3100/api/workspace", {
        headers: { host: "127.0.0.1:3100" },
      }),
    ),
  ).not.toThrow();
  expect(() =>
    validateRequest(
      new Request("http://127.0.0.1:3100/api/workspace", {
        headers: { host: "attacker.example:3100" },
      }),
    ),
  ).toThrow();
  expect(() =>
    validateRequest(
      new Request("http://127.0.0.1:3100/api/workspace", {
        method: "POST",
        headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3000" },
      }),
    ),
  ).toThrow();
});
it.each(["0", "80", "65536", "3000.evil", "3000/path"])(
  "rejects invalid port %s",
  (port) => expect(() => localEndpoints(port)).toThrow(),
);
