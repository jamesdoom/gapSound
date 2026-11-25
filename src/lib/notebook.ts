import { z } from "zod";
export function splitTags(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().replace(/[A-Z]/g, (c) => c.toLowerCase()))
        .filter(Boolean),
    ),
  ];
}
export const noteInput = z
  .object({
    action: z.literal("note"),
    id: z.uuid().optional(),
    revision: z.number().int().nonnegative().optional(),
    title: z.string().trim().min(1).max(200),
    body: z
      .string()
      .min(1)
      .max(20000)
      .refine((value) => value.trim().length > 0, "Note cannot be blank"),
    tags: z
      .string()
      .max(500)
      .refine(
        (s) =>
          splitTags(s).length <= 20 &&
          splitTags(s).every(
            (t) => t.length <= 40 && !/[\u0000-\u001f\u007f]/.test(t),
          ),
        "Use up to 20 tags of 40 characters",
      ),
  })
  .refine(
    (v) => !v.id || v.revision !== undefined,
    "Revision required when editing",
  );
export const notebookQuery = z.object({
  query: z.string().max(200).default(""),
  tag: z.string().max(500).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const exportCursor = z.object({
  cutoff: z.iso.datetime(),
  beforeAt: z.iso.datetime(),
  beforeId: z.string().min(1).max(64),
});
