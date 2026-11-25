import { NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson, validateRequest } from "@/lib/security";
import { archiveBriefingInput, generateBriefingInput } from "@/lib/briefings";
import {
  archiveBriefing,
  BriefingError,
  generateBriefing,
  readBriefings,
} from "@/services/briefings";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const actions = z.discriminatedUnion("action", [
  generateBriefingInput,
  archiveBriefingInput,
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
  const input = z
    .object({
      day: z.iso.date(),
      page: z.coerce.number().int().min(1).max(10000),
      id: z.uuid().optional(),
    })
    .safeParse({
      day: params.get("day"),
      page: params.get("page") ?? 1,
      id: params.get("id") || undefined,
    });
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid briefing date, page or identifier" },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      await readBriefings(input.data.day, input.data.page, input.data.id),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof BriefingError
            ? error.message
            : "Briefings unavailable. Run npm run db:migrate and retry.",
      },
      { status: error instanceof BriefingError ? 404 : 503 },
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
  let input;
  try {
    input = actions.safeParse(await boundedJson(request));
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON or request exceeds 32 KiB" },
      { status: 400 },
    );
  }
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid briefing action" },
      { status: 400 },
    );
  try {
    if (input.data.action === "generate")
      return NextResponse.json(await generateBriefing(input.data));
    await archiveBriefing(input.data.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof BriefingError
            ? error.message
            : "Briefing update unavailable. Check database setup and retry.",
      },
      { status: error instanceof BriefingError ? 400 : 503 },
    );
  }
}
