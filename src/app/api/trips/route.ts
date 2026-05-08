/**
 * GET /api/trips
 *
 * Search for Norwegian hiking trips via the UT.no GraphQL API.
 *
 * Query parameters:
 *   area         string   Area name to filter by, e.g. "Jotunheimen" (resolved to ID automatically)
 *   areaId       number   Numeric UT.no area ID (faster — skips the name-lookup request)
 *   grading      string   EASY | MODERATE | TOUGH | VERY_TOUGH
 *   activityType string   HIKING | SKI_TOURING | CYCLING | CLIMBING | PADDLING | OTHER
 *   minDistance  number   Min trip distance in metres
 *   maxDistance  number   Max trip distance in metres
 *   maxHours     number   Max duration in hours
 *   limit        number   Results per page (default 20, max 100)
 *   after        string   Pagination cursor from a previous response
 *
 * For nearby trips pass lat + lng instead of area:
 *   lat          number   Latitude
 *   lng          number   Longitude
 *   radius       number   Search radius in metres (default 10000)
 *
 * Examples:
 *   GET /api/trips?area=Jotunheimen&grading=MODERATE&limit=10
 *   GET /api/trips?areaId=1231&activityType=HIKING
 *   GET /api/trips?lat=61.5&lng=8.9&radius=15000
 *   GET /api/trips?after=<cursor>
 */

import { NextResponse } from "next/server";
import {
  searchTrips,
  tripsNear,
  resolveAreaId,
} from "@/lib/apis/utno";
import type { TripGrading, TripActivityType } from "@/types";

const VALID_GRADINGS: TripGrading[] = ["EASY", "MODERATE", "TOUGH", "VERY_TOUGH"];
const VALID_ACTIVITY_TYPES: TripActivityType[] = [
  "HIKING",
  "SKI_TOURING",
  "CYCLING",
  "CLIMBING",
  "PADDLING",
  "OTHER",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // ── Parse params ────────────────────────────────────────────────────────────
  const areaName = searchParams.get("area") ?? undefined;
  const areaIdRaw = searchParams.get("areaId");
  const gradingRaw = searchParams.get("grading")?.toUpperCase();
  const activityTypeRaw = searchParams.get("activityType")?.toUpperCase();
  const minDistanceRaw = searchParams.get("minDistance");
  const maxDistanceRaw = searchParams.get("maxDistance");
  const maxHoursRaw = searchParams.get("maxHours");
  const limitRaw = searchParams.get("limit");

  const minDistance = minDistanceRaw != null ? Number(minDistanceRaw) : undefined;
  const maxDistance = maxDistanceRaw != null ? Number(maxDistanceRaw) : undefined;
  const maxHours = maxHoursRaw != null ? Number(maxHoursRaw) : undefined;
  const limit = limitRaw != null ? Math.min(Number(limitRaw), 100) : 20;
  const after = searchParams.get("after") ?? undefined;

  // Nearby mode
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const radiusRaw = searchParams.get("radius");

  // ── Validate ─────────────────────────────────────────────────────────────────
  if (gradingRaw && !VALID_GRADINGS.includes(gradingRaw as TripGrading)) {
    return NextResponse.json(
      { error: `Invalid grading. Must be one of: ${VALID_GRADINGS.join(", ")}` },
      { status: 400 }
    );
  }

  if (activityTypeRaw && !VALID_ACTIVITY_TYPES.includes(activityTypeRaw as TripActivityType)) {
    return NextResponse.json(
      { error: `Invalid activityType. Must be one of: ${VALID_ACTIVITY_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (minDistanceRaw != null && isNaN(minDistance!))
    return NextResponse.json({ error: "minDistance must be a number" }, { status: 400 });
  if (maxDistanceRaw != null && isNaN(maxDistance!))
    return NextResponse.json({ error: "maxDistance must be a number" }, { status: 400 });
  if (maxHoursRaw != null && isNaN(maxHours!))
    return NextResponse.json({ error: "maxHours must be a number" }, { status: 400 });
  if (limitRaw != null && isNaN(limit))
    return NextResponse.json({ error: "limit must be a number" }, { status: 400 });

  try {
    // ── Nearby mode ───────────────────────────────────────────────────────────
    if (latRaw && lngRaw) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      const radius = radiusRaw ? Number(radiusRaw) : 10_000;

      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ error: "lat and lng must be valid numbers" }, { status: 400 });
      }

      const results = await tripsNear({ lat, lng, radiusMetres: radius });

      return NextResponse.json({
        mode: "nearby",
        lat,
        lng,
        radiusMetres: radius,
        totalCount: results.length,
        trips: results.map((r) => ({
          distanceFromPoint: r.distanceFromPoint,
          ...r.trip,
        })),
      });
    }

    // ── Standard search mode ──────────────────────────────────────────────────
    let areaId: number | undefined = areaIdRaw ? Number(areaIdRaw) : undefined;

    // Resolve area name → ID if only a name was given
    if (!areaId && areaName) {
      const resolved = await resolveAreaId(areaName);
      if (resolved === null) {
        return NextResponse.json(
          { error: `Area not found: "${areaName}". Try /api/trips/areas?q=<name> to search.` },
          { status: 404 }
        );
      }
      areaId = resolved;
    }

    const result = await searchTrips({
      areaId,
      grading: gradingRaw as TripGrading | undefined,
      activityType: activityTypeRaw as TripActivityType | undefined,
      minDistance,
      maxDistance,
      maxDurationHours: maxHours,
      limit,
      after,
    });

    return NextResponse.json({
      mode: "search",
      totalCount: result.totalCount,
      nextCursor: result.nextCursor,
      trips: result.trips,
    });
  } catch (error) {
    console.error("[/api/trips] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips from UT.no" },
      { status: 502 }
    );
  }
}
