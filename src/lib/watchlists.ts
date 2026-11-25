import { z } from "zod";
export const saveWatchlistInput = z.object({
  action: z.literal("save"),
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(80),
  terms: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(10)
    .transform((values) => [
      ...new Set(values.map((value) => value.toLowerCase())),
    ]),
});
export const deleteWatchlistInput = z.object({
  action: z.literal("delete"),
  id: z.uuid(),
  confirmed: z.literal(true),
});
