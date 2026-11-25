import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { articles, notes, sessions, settings, tasks } from "@/db/schema";
import { boundedJson, validateRequest } from "@/lib/security";
import { workspace } from "@/services/workspace";
import { refreshFeeds } from "@/services/feeds";
import { intelligenceQuery } from "@/lib/intelligence-query";
import { WatchlistError } from "@/services/watchlists";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("refresh") }),
  z.object({
    action: z.literal("article"),
    id: z.string().max(64),
    bookmarked: z.boolean().optional(),
    read: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("task"),
    title: z.string().trim().min(1).max(200),
    day: z.iso.date(),
  }),
  z.object({
    action: z.literal("toggle-task"),
    id: z.uuid(),
    done: z.boolean(),
  }),
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("stop") }),
  z.object({
    action: z.literal("note"),
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(20000),
    tags: z.string().max(500),
  }),
  z.object({
    action: z.literal("settings"),
    weeklyHours: z.number().int().min(1).max(100),
    refreshMinutes: z.number().int().min(15).max(1440),
  }),
]);
export async function GET(request: Request) {
  try {
    validateRequest(request);
  } catch {
    return NextResponse.json(
      { error: "Local same-origin access required" },
      { status: 403 },
    );
  }
  const params = new URL(request.url).searchParams;
  const day = z.iso.date().safeParse(params.get("day"));
  const browse = intelligenceQuery.safeParse({
    query: (params.get("q") ?? "").slice(0, 200),
    source: (params.get("source") ?? "").slice(0, 100),
    category: (params.get("category") ?? "").slice(0, 100),
    saved: params.get("saved") === "true",
    page: params.get("page") ?? 1,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    watchlistId: params.get("watchlist") || undefined,
  });
  if (!browse.success)
    return NextResponse.json(
      { error: "Invalid page or publication date range" },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await workspace(
        (params.get("q") ?? "").slice(0, 200),
        (params.get("source") ?? "").slice(0, 100),
        (params.get("category") ?? "").slice(0, 100),
        params.get("saved") === "true",
        day.success ? day.data : new Date().toISOString().slice(0, 10),
        {
          page: browse.data.page,
          from: browse.data.from,
          to: browse.data.to,
          watchlistId: browse.data.watchlistId,
        },
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof WatchlistError)
      return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(
      {
        error:
          "Database unavailable. Run npm run db:migrate before starting GapSound.",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    validateRequest(request);
  } catch {
    return NextResponse.json(
      { error: "Local same-origin access required" },
      { status: 403 },
    );
  }
  let parsed;
  try {
    parsed = actionSchema.safeParse(await boundedJson(request));
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON or request exceeds 32 KiB" },
      { status: 400 },
    );
  }
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid action or input" },
      { status: 400 },
    );
  const input = parsed.data;
  try {
    switch (input.action) {
      case "refresh":
        await refreshFeeds();
        break;
      case "article":
        await db
          .update(articles)
          .set({ bookmarked: input.bookmarked, read: input.read })
          .where(eq(articles.id, input.id));
        break;
      case "task":
        await db.insert(tasks).values({
          id: crypto.randomUUID(),
          title: input.title,
          day: input.day,
        });
        break;
      case "toggle-task":
        await db
          .update(tasks)
          .set({ done: input.done })
          .where(eq(tasks.id, input.id));
        break;
      case "start":
        await db
          .insert(sessions)
          .values({
            id: crypto.randomUUID(),
            startedAt: new Date().toISOString(),
          })
          .onConflictDoNothing();
        break;
      case "stop":
        await db
          .update(sessions)
          .set({ endedAt: new Date().toISOString() })
          .where(isNull(sessions.endedAt));
        break;
      case "note":
        await db.insert(notes).values({
          id: crypto.randomUUID(),
          title: input.title,
          body: input.body,
          tags: input.tags,
          createdAt: new Date().toISOString(),
        });
        break;
      case "settings":
        await db
          .update(settings)
          .set({
            weeklyHours: input.weeklyHours,
            refreshMinutes: input.refreshMinutes,
          })
          .where(eq(settings.id, "local"));
        break;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error: "Could not complete action. Check database setup and try again.",
      },
      { status: 500 },
    );
  }
}
