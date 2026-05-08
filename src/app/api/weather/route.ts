/**
 * GET /api/weather
 * Simple proxy to the Yr/MET Norway weather API to avoid CORS issues.
 *
 * Query parameters:
 *   lat  number  Latitude
 *   lng  number  Longitude
 *
 * Returns: WeatherDay[]
 */

import { NextResponse } from "next/server";
import { fetchWeather } from "@/lib/apis/yr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing lat and/or lng parameters" },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json(
      { error: "lat and lng must be valid numbers" },
      { status: 400 }
    );
  }

  try {
    const days = await fetchWeather(latNum, lngNum);
    return NextResponse.json(days);
  } catch (error) {
    console.error("[/api/weather] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 502 }
    );
  }
}
