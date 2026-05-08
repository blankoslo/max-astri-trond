/**
 * GET /api/trips/[id]/cabins
 *
 * Find cabins along a specific trip route.
 * Fetches the trip's GeoJSON geometry, samples points along it, and queries
 * cabinsNear for each point, returning deduplicated results sorted by
 * distance from the route.
 *
 * Query parameters:
 *   interval   number   Sample interval in metres (default 3000). Smaller = more
 *                       coverage but more API calls. Recommended: 2000–5000.
 *   radius     number   Search radius around each sample point in metres (default 2000).
 *                       Should be ≥ interval/2 to avoid gaps in coverage.
 *
 * Example:
 *   GET /api/trips/112630/cabins
 *   GET /api/trips/112630/cabins?interval=2000&radius=3000
 *
 * Response:
 *   { tripId, tripName, tripDistanceMetres, sampleIntervalMetres, searchRadiusMetres, totalCabins, cabins: UtnoCabin[] }
 */

import { NextResponse } from "next/server";
import { gqlTripById, cabinsAlongRoute } from "@/lib/apis/utno";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);

  if (!tripId || isNaN(tripId)) {
    return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const intervalRaw = searchParams.get("interval");
  const radiusRaw = searchParams.get("radius");
  const interval = intervalRaw ? Number(intervalRaw) : 3_000;
  const radius = radiusRaw ? Number(radiusRaw) : 2_000;

  if (isNaN(interval) || interval < 100) {
    return NextResponse.json({ error: "interval must be a number ≥ 100" }, { status: 400 });
  }
  if (isNaN(radius) || radius < 100) {
    return NextResponse.json({ error: "radius must be a number ≥ 100" }, { status: 400 });
  }

  try {
    const trip = await gqlTripById(tripId);

    if (!trip) {
      return NextResponse.json({ error: `Trip ${tripId} not found` }, { status: 404 });
    }

    if (!trip.geojson?.coordinates?.length) {
      return NextResponse.json(
        { error: `Trip ${tripId} has no route geometry` },
        { status: 422 }
      );
    }

    const coords = trip.geojson.coordinates;
    const cabins = await cabinsAlongRoute({
      routeCoordinates: coords,
      sampleIntervalMetres: interval,
      searchRadiusMetres: radius,
    });

    return NextResponse.json({
      tripId,
      tripName: trip.name,
      tripDistanceMetres: trip.distance,
      sampleIntervalMetres: interval,
      searchRadiusMetres: radius,
      totalCabins: cabins.length,
      cabins,
    });
  } catch (error) {
    console.error(`[/api/trips/${tripId}/cabins] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch cabins along route" },
      { status: 502 }
    );
  }
}
