import { z } from "zod";
import packaged from "./publisher-notices.json" with { type: "json" };
import { safeUrl } from "./security";

export const noticeId = z.enum(["cve", "cisa", "sans", "krebs", "bleeping"]);
export const publisherNoticeSchema = z.object({
  version: z.literal(1),
  reviewedAt: z.iso.date(),
  scope: z.string().max(1000),
  items: z
    .array(
      z.object({
        id: noticeId,
        name: z.string().max(200),
        attribution: z.string().max(1000),
        termsUrl: z
          .string()
          .max(4000)
          .refine((value) => safeUrl(value) !== null),
        text: z.string().max(20000),
      }),
    )
    .min(1)
    .max(5)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
    ),
});
export type PublisherNoticeBundle = z.infer<typeof publisherNoticeSchema>;
export const publisherNotices = publisherNoticeSchema.parse(packaged);
export function sourceAttribution(id: string) {
  return publisherNotices.items.find((notice) => notice.id === id)?.attribution;
}
