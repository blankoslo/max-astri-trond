/**
 * GET /api/cabins?lat=&lng=&radius=
 *
 * Returns cabins near a map viewport centre.
 * Used by the "show all cabins" map toggle.
 *
 * Query params:
 *   lat     number  Latitude  (required)
 *   lng     number  Longitude (required)
 *   radius  number  Search radius in metres (default 25 000)
 */

import { NextResponse } from "next/server";
import { cabinsNear } from "@/lib/apis/utno";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat    = Number(searchParams.get("lat"));
  const lng    = Number(searchParams.get("lng"));
  const radius = searchParams.get("radius") ? Number(searchParams.get("radius")) : 25_000;

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const results = await cabinsNear({ lat, lng, radiusMetres: radius });
    return NextResponse.json({ cabins: results.map((r) => ({ ...r.cabin, distanceFromPoint: r.distance })) });
  } catch (err) {
    console.error("[/api/cabins] Error:", err);
    return NextResponse.json({ error: "Failed to fetch cabins" }, { status: 502 });
  }
}
