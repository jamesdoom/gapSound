import { z } from "zod";
export const reviewAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().trim().min(1).max(200),
    dueDay: z.iso.date(),
  }),
  z.object({
    action: z.literal("reschedule"),
    id: z.uuid(),
    dueDay: z.iso.date(),
  }),
  z.object({ action: z.literal("complete"), id: z.uuid() }),
]);
