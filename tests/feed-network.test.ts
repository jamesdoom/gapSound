import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
vi.mock("node:https", () => ({ request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import {
  fetchPublicFeed,
  isPublicAddress,
  resolvePublicAddress,
  SourceHttpError,
} from "../src/lib/feed-network";
afterEach(() => vi.clearAllMocks());
describe("destination validation", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "192.0.2.1",
    "198.51.100.1",
    "203.0.113.1",
    "198.18.0.1",
    "224.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:8.8.8.8",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "3fff::1",
    "4000::1",
    "invalid",
  ])("blocks non-public %s", (value) =>
    expect(isPublicAddress(value)).toBe(false),
  );
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "accepts public %s",
    (value) => expect(isPublicAddress(value)).toBe(true),
  );
  it("rejects mixed public/private DNS answers", async () => {
    const resolver = vi.fn().mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    await expect(resolvePublicAddress("example.com", resolver)).rejects.toThrow(
      "non-public",
    );
  });
  it("returns the validated address without performing a second lookup", async () => {
    const resolver = vi
      .fn()
      .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
      .mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    expect(await resolvePublicAddress("example.com", resolver)).toEqual({
      address: "8.8.8.8",
      family: 4,
    });
    expect(resolver).toHaveBeenCalledTimes(1);
  });
});
function responseFixture(
  status: number,
  chunks: string[] = [],
  encoding?: string,
) {
  const response = Object.assign(new EventEmitter(), {
    statusCode: status,
    headers: { "content-encoding": encoding },
    destroy: vi.fn(),
  });
  const req = Object.assign(new EventEmitter(), {
    end() {
      queueMicrotask(() => {
        callback(response);
        for (const chunk of chunks) response.emit("data", Buffer.from(chunk));
        response.emit("end");
        req.emit("close");
      });
    },
  });
  let callback: (value: typeof response) => void;
  vi.mocked(request).mockImplementation(((
    _url: unknown,
    _options: unknown,
    handler: typeof callback,
  ) => {
    callback = handler;
    return req;
  }) as unknown as typeof request);
  return { response, req };
}
describe("bounded HTTPS transport", () => {
  const url = "https://example.com/feed";
  it("rejects unapproved URLs before networking", async () => {
    await expect(fetchPublicFeed("https://localhost/", [url])).rejects.toThrow(
      "not approved",
    );
    expect(request).not.toHaveBeenCalled();
  });
  it.each([302, 403, 429, 500])(
    "fails closed on HTTP %s without redirect/retry",
    async (status) => {
      const fixture = responseFixture(status);
      await expect(fetchPublicFeed(url, [url])).rejects.toEqual(
        new SourceHttpError(status),
      );
      expect(request).toHaveBeenCalledTimes(1);
      expect(fixture.response.destroy).toHaveBeenCalled();
    },
  );
  it("bounds streamed bytes", async () => {
    responseFixture(200, ["12345", "67890"]);
    await expect(fetchPublicFeed(url, [url], 15000, 8)).rejects.toThrow(
      "size limit",
    );
  });
  it("does not accept unexpected compression", async () => {
    responseFixture(200, [], "gzip");
    await expect(fetchPublicFeed(url, [url])).rejects.toThrow("encoding");
  });
  it("reads successful chunks", async () => {
    responseFixture(200, ["hello", " world"]);
    await expect(fetchPublicFeed(url, [url])).resolves.toBe("hello world");
  });
  it("pins socket lookup to validated addresses for single and all lookup modes", async () => {
    vi.mocked(lookup).mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
    ] as never);
    responseFixture(200, ["ok"]);
    await fetchPublicFeed(url, [url]);
    const options = vi.mocked(request).mock.calls[0][1] as {
      lookup: (
        host: string,
        options: { all: boolean },
        callback: (...args: unknown[]) => void,
      ) => void;
      agent: boolean;
    };
    expect(options.agent).toBe(false);
    for (const all of [false, true]) {
      const args = await new Promise<unknown[]>((resolve) =>
        options.lookup("example.com", { all }, (...values) => resolve(values)),
      );
      expect(args).toEqual(
        all
          ? [null, [{ address: "8.8.8.8", family: 4 }]]
          : [null, "8.8.8.8", 4],
      );
    }
  });
});
