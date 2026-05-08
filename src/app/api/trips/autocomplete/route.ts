/**
 * GET /api/trips/autocomplete?q=<query>
 *
 * Proxies the UT.no autocomplete endpoint so the browser avoids CORS issues.
 * Returns up to 10 combined area + trip suggestions.
 */

import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/apis/utno";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  try {
    const results = await autocomplete(q);
    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (error) {
    console.error("[/api/trips/autocomplete] Error:", error);
    return NextResponse.json(
      { error: "Autocomplete failed" },
      { status: 502 }
    );
  }
}
