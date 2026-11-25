import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/security";
import { publisherNotices } from "@/lib/publisher-notices";
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
  return NextResponse.json(publisherNotices, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition":
        'attachment; filename="gapsound-publisher-notices.json"',
    },
  });
}
