import { NextResponse } from "next/server";
import { boundedJson, validateRequest } from "@/lib/security";
import { readReviews, updateReview, ReviewError } from "@/services/reviews";
import { z } from "zod";
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
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .safeParse(new URL(request.url).searchParams.get("page") ?? 1);
  if (!page.success)
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  try {
    return NextResponse.json(await readReviews(page.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Reviews unavailable. Run npm run db:migrate and retry." },
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
    return NextResponse.json(await updateReview(value));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ReviewError
            ? error.message
            : error instanceof z.ZodError
              ? "Invalid review action, title or date"
              : "Review update unavailable. Check database setup and retry.",
      },
      {
        status:
          error instanceof ReviewError || error instanceof z.ZodError
            ? 400
            : 503,
      },
    );
  }
}
