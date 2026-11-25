import { z } from "zod";
export const ARTICLE_PAGE_SIZE = 25;
export const intelligenceQuery = z
  .object({
    query: z.string().max(200).default(""),
    source: z.string().max(100).default(""),
    category: z.string().max(100).default(""),
    saved: z.boolean().default(false),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "Publication start date must be on or before end date",
  });
