import { NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson, validateRequest } from "@/lib/security";
import {
  readObjectivePlan,
  updateObjectivePlan,
  ObjectiveError,
} from "@/services/objectives";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    validateRequest(request);
  } catch {
    return NextResponse.json(
      { error: "Local same-origin access required" },
      { status: 403 },
    );
  }
  try {
    return NextResponse.json(await readObjectivePlan(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Objective plan unavailable. Run npm run db:migrate and retry.",
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
  let input: unknown;
  try {
    input = await boundedJson(request);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON or request exceeds 32 KiB" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await updateObjectivePlan(input));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ObjectiveError
            ? error.message
            : error instanceof z.ZodError
              ? "Invalid objective plan. Use up to 20 distinct titles of 1–200 characters."
              : "Could not update objective plan. Check database setup and retry.",
      },
      {
        status:
          error instanceof ObjectiveError
            ? 409
            : error instanceof z.ZodError
              ? 400
              : 503,
      },
    );
  }
}
