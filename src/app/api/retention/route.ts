import { NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson, validateRequest } from "@/lib/security";
import {
  cleanupInput,
  cleanupRetention,
  ExpiredRetentionPreview,
  previewRetention,
} from "@/services/retention";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview") }),
  cleanupInput,
]);
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
    input = actionSchema.safeParse(await boundedJson(request));
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON or request exceeds 32 KiB" },
      { status: 400 },
    );
  }
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid cleanup request or missing confirmation" },
      { status: 400 },
    );
  try {
    const result =
      input.data.action === "preview"
        ? await previewRetention()
        : await cleanupRetention(input.data);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ExpiredRetentionPreview)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(
      { error: "Cleanup unavailable. Check database setup and try again." },
      { status: 503 },
    );
  }
}
