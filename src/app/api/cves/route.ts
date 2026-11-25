import { NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson, validateRequest } from "@/lib/security";
import { cveAction, cveQuery } from "@/lib/cve-record";
import {
  CveResearchError,
  listVulnerabilities,
  lookupCve,
  saveVulnerability,
} from "@/services/cve-research";
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
  const input = cveQuery.safeParse({
    query: params.get("q") ?? "",
    vendor: params.get("vendor") ?? "",
    severity: params.get("severity") ?? "",
    saved: params.get("saved") === "true",
    page: params.get("page") ?? 1,
  });
  if (!input.success)
    return NextResponse.json({ error: "Invalid CVE filters" }, { status: 400 });
  try {
    return NextResponse.json(await listVulnerabilities(input.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "CVE research unavailable. Run npm run db:migrate and retry." },
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
  let input;
  try {
    input = cveAction.parse(await boundedJson(request));
  } catch {
    return NextResponse.json(
      { error: "Invalid CVE action or request exceeds 32 KiB" },
      { status: 400 },
    );
  }
  try {
    if (input.action === "lookup")
      return NextResponse.json(await lookupCve(input));
    await saveVulnerability(input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof CveResearchError
            ? error.message
            : error instanceof z.ZodError
              ? "Invalid CVE action"
              : "CVE update unavailable. Check database setup and retry.",
      },
      {
        status:
          error instanceof CveResearchError
            ? error.status
            : error instanceof z.ZodError
              ? 400
              : 503,
      },
    );
  }
}
