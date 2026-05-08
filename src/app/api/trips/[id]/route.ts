/**
 * GET /api/trips/[id]
 * Returns a single trip by ID, including full GeoJSON route geometry.
 */

import { NextResponse } from "next/server";
import { gqlTripById } from "@/lib/apis/utno";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);

  if (!tripId || isNaN(tripId)) {
    return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
  }

  try {
    const trip = await gqlTripById(tripId);
    if (!trip) {
      return NextResponse.json({ error: `Trip ${tripId} not found` }, { status: 404 });
    }
    return NextResponse.json(trip);
  } catch (error) {
    console.error(`[/api/trips/${tripId}] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 502 });
  }
}
