import { describe, expect, it } from "vitest";
import {
  failureSchedule,
  MAX_BACKOFF_MS,
  MIN_RETRY_MS,
  retryAfterTime,
  sourceCanRefresh,
} from "../src/lib/feed-retry";
const now = Date.parse("2026-11-25T16:00:00Z");
describe("retry policy", () => {
  it("accepts delay-seconds and HTTP dates", () => {
    expect(retryAfterTime("3600", now)).toBe(now + 3600000);
    expect(retryAfterTime("Wed, 25 Nov 2026 18:00:00 GMT", now)).toBe(
      now + 7200000,
    );
  });
  it.each([
    "-10",
    "1.5",
    "tomorrow",
    "2026-11-26",
    "Infinity",
    "",
    "Tue, 24 Nov 2026 18:00:00 GMT",
  ])("ignores malformed or past value %s", (header) =>
    expect(retryAfterTime(header, now)).toBeNull(),
  );
  it("bounds huge numeric headers without overflowing the timestamp", () =>
    expect(Number.isFinite(retryAfterTime("9".repeat(100), now))).toBe(true));
  it("increases delays to a 24-hour maximum", () => {
    expect(Date.parse(failureSchedule(0, now).nextAttemptAt)).toBe(
      now + MIN_RETRY_MS,
    );
    expect(Date.parse(failureSchedule(1, now).nextAttemptAt)).toBe(
      now + 2 * MIN_RETRY_MS,
    );
    expect(Date.parse(failureSchedule(32, now).nextAttemptAt)).toBe(
      now + MAX_BACKOFF_MS,
    );
    expect(failureSchedule(32, now).consecutiveFailures).toBe(32);
  });
  it("honors provider delays longer than local maximum backoff", () =>
    expect(Date.parse(failureSchedule(1, now, "172800").nextAttemptAt)).toBe(
      now + 172800000,
    ));
  it("does not let a short provider delay bypass local cooldown", () =>
    expect(Date.parse(failureSchedule(0, now, "0").nextAttemptAt)).toBe(
      now + MIN_RETRY_MS,
    ));
  it("checks retry eligibility at the exact boundary and handles old records", () => {
    expect(
      sourceCanRefresh({ lastAttempt: null, nextAttemptAt: null }, now),
    ).toBe(true);
    const state = {
      lastAttempt: new Date(now).toISOString(),
      nextAttemptAt: new Date(now + 7200000).toISOString(),
    };
    expect(sourceCanRefresh(state, now + MIN_RETRY_MS)).toBe(false);
    expect(sourceCanRefresh(state, now + 7200000)).toBe(true);
    expect(
      sourceCanRefresh(
        { lastAttempt: new Date(now).toISOString(), nextAttemptAt: null },
        now + 1,
      ),
    ).toBe(false);
  });
});

it("enforces a publisher floor on legacy timestamps, failures and longer Retry-After", () => {
  const hour = 3600000;
  expect(
    sourceCanRefresh(
      {
        lastAttempt: new Date(now).toISOString(),
        nextAttemptAt: new Date(now + MIN_RETRY_MS).toISOString(),
      },
      now + MIN_RETRY_MS,
      hour,
    ),
  ).toBe(false);
  expect(
    sourceCanRefresh(
      { lastAttempt: new Date(now).toISOString(), nextAttemptAt: null },
      now + hour,
      hour,
    ),
  ).toBe(true);
  expect(
    Date.parse(failureSchedule(0, now, undefined, hour).nextAttemptAt),
  ).toBe(now + hour);
  expect(
    Date.parse(failureSchedule(1, now, undefined, hour).nextAttemptAt),
  ).toBe(now + 2 * hour);
  expect(Date.parse(failureSchedule(0, now, "7200", hour).nextAttemptAt)).toBe(
    now + 2 * hour,
  );
});
