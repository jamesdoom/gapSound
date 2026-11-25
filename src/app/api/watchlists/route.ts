import { NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson, validateRequest } from "@/lib/security";
import { saveWatchlistInput, deleteWatchlistInput } from "@/lib/watchlists";
import {
  saveWatchlist,
  deleteWatchlist,
  WatchlistError,
} from "@/services/watchlists";
export const runtime = "nodejs";
const actionSchema = z.discriminatedUnion("action", [
  saveWatchlistInput,
  deleteWatchlistInput,
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
      {
        error:
          "Provide a name and 1–10 terms (up to 60 characters each), or confirm a valid deletion.",
      },
      { status: 400 },
    );
  try {
    if (input.data.action === "save")
      return NextResponse.json(await saveWatchlist(input.data));
    await deleteWatchlist(input.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof WatchlistError
            ? error.message
            : "Watchlist update unavailable. Check database setup and try again.",
      },
      { status: error instanceof WatchlistError ? 409 : 503 },
    );
  }
}
