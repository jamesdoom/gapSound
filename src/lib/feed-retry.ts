export const MIN_RETRY_MS = 15 * 60 * 1000;
export const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000;
const MAX_DATE = Date.UTC(9999, 11, 31);
// Retry-After: decimal seconds or HTTP-date (RFC 9110 §10.2.3).
export function retryAfterTime(
  header: string | undefined,
  now: number,
): number | null {
  if (!header || header.length > 128) return null;
  const value = header.trim();
  if (/^\d+$/.test(value))
    return Math.min(MAX_DATE, now + Number(value) * 1000);
  if (
    !/^(?:[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]+, \d{2}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]{3} [A-Za-z]{3} [ \d]\d \d{2}:\d{2}:\d{2} \d{4})$/.test(
      value,
    )
  )
    return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= now ? Math.min(MAX_DATE, time) : null;
}
export function failureSchedule(
  previousFailures: number,
  now: number,
  retryAfter?: string,
  minimumMs = MIN_RETRY_MS,
) {
  const consecutiveFailures = Math.min(32, Math.max(0, previousFailures) + 1);
  const backoff = Math.min(
    MAX_BACKOFF_MS,
    Math.max(MIN_RETRY_MS, minimumMs) * 2 ** (consecutiveFailures - 1),
  );
  return {
    consecutiveFailures,
    nextAttemptAt: new Date(
      Math.max(now + backoff, retryAfterTime(retryAfter, now) ?? 0),
    ).toISOString(),
  };
}
export function sourceCanRefresh(
  source: { lastAttempt: string | null; nextAttemptAt: string | null },
  now: number,
  minimumMs = MIN_RETRY_MS,
) {
  return (
    (!source.lastAttempt ||
      now >=
        Date.parse(source.lastAttempt) + Math.max(MIN_RETRY_MS, minimumMs)) &&
    (!source.nextAttemptAt || now >= Date.parse(source.nextAttemptAt))
  );
}
