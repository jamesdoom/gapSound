import { NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson, validateRequest } from "@/lib/security";
import {
  listNotes,
  exportNotes,
  saveNote,
  NotebookError,
} from "@/services/notebook";
import { notebookQuery, exportCursor } from "@/lib/notebook";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
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
  try {
    const query = notebookQuery.parse({
      query: params.get("q") ?? "",
      tag: params.get("tag") ?? "",
      page: params.get("page") ?? 1,
    });
    let cursor;
    if (params.has("cursor")) {
      const raw = params.get("cursor")!;
      if (raw.length > 500)
        return NextResponse.json(
          { error: "Invalid export cursor" },
          { status: 400 },
        );
      try {
        cursor = exportCursor.parse(JSON.parse(raw));
      } catch {
        return NextResponse.json(
          { error: "Invalid export cursor" },
          { status: 400 },
        );
      }
    }
    return NextResponse.json(
      params.get("export") === "true"
        ? await exportNotes(query, cursor)
        : await listNotes(query),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid notebook filters"
            : "Notebook unavailable. Run npm run db:migrate and retry.",
      },
      { status: error instanceof z.ZodError ? 400 : 503 },
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
  let value;
  try {
    value = await boundedJson(request);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON or request exceeds 32 KiB" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await saveNote(value));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof NotebookError
            ? error.message
            : error instanceof z.ZodError
              ? "Invalid note. Use a title, body and up to 20 tags of 40 characters."
              : "Note update unavailable. Check database setup and retry.",
      },
      {
        status:
          error instanceof NotebookError
            ? 409
            : error instanceof z.ZodError
              ? 400
              : 503,
      },
    );
  }
}
