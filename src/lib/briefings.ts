import { z } from "zod";
import { safeUrl } from "./security";
import { publisherNoticeSchema } from "./publisher-notices";
const link = z
  .string()
  .max(4000)
  .refine((value) => safeUrl(value) !== null, "Unsafe reference URL");
const legacySnapshot = z.object({
  publisherNotices: publisherNoticeSchema.optional(),
  version: z.literal(1),
  day: z.iso.date(),
  timeZone: z.string().max(100),
  generatedAt: z.iso.datetime(),
  windowStart: z.iso.datetime(),
  news: z
    .array(
      z.object({
        title: z.string().max(500),
        url: link,
        source: z.string().max(200),
        publisherNotice: z.string().max(5000).nullable().optional(),
        publishedAt: z.iso.datetime().nullable(),
        summary: z.string().max(240),
        matchedTerms: z.array(z.string().max(60)).max(5),
        saved: z.boolean(),
      }),
    )
    .max(3),
  kevs: z
    .array(
      z.object({
        id: z.string().regex(/^CVE-\d{4}-\d{4,19}$/),
        name: z.string().max(2000),
        addedAt: z.iso.date(),
        action: z.string().max(10000),
      }),
    )
    .max(3),
  sources: z
    .array(
      z.object({
        name: z.string().max(200),
        status: z.enum(["fresh", "stale", "error", "missing"]),
        lastSuccess: z.iso.datetime().nullable(),
      }),
    )
    .max(10),
  objectives: z
    .array(z.object({ title: z.string().max(200), done: z.boolean() }))
    .max(100),
  reviewPrompts: z
    .array(z.object({ title: z.string().max(200), day: z.iso.date() }))
    .max(3),
  learning: z.object({
    topic: z.string().max(200),
    url: link,
    question: z.string().max(1000),
    answer: z.string().max(2000),
  }),
});
export const briefingSnapshot = z.discriminatedUnion("version", [
  legacySnapshot,
  legacySnapshot.extend({
    version: z.literal(2),
    dueReviews: z
      .array(
        z.object({
          id: z.uuid(),
          title: z.string().max(200),
          dueDay: z.iso.date(),
        }),
      )
      .max(100),
    dueReviewCount: z.number().int().nonnegative().max(10000),
  }),
]);
export type BriefingSnapshot = z.infer<typeof briefingSnapshot>;
export function calendarDay(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) =>
    parts.find((value) => value.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const generateBriefingInput = z.object({
  action: z.literal("generate"),
  day: z.iso.date(),
  timeZone: z.string().min(1).max(100),
});
export const archiveBriefingInput = z.object({
  action: z.literal("archive"),
  id: z.uuid(),
});
