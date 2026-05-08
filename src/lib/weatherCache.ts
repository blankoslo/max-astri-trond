/**
 * Supabase-backed weather cache.
 *
 * Key: lat/lon rounded to 2 decimal places (~1 km grid).
 * On a successful Yr fetch the route calls `saveWeatherCache`.
 * On failure it calls `loadWeatherCache` to get the last known-good forecast.
 */

import { supabase } from "@/lib/supabase";
import type { WeatherDay } from "@/types";

export interface CachedWeather {
  days: WeatherDay[];
  /** ISO timestamp of when the real Yr data was originally fetched */
  fetchedAt: string;
}

/** Round to 2 dp so nearby coordinates share a cache entry */
function roundCoord(n: number) {
  return Math.round(n * 100) / 100;
}

/** Persist a fresh Yr forecast to Supabase (fire-and-forget on errors). */
export async function saveWeatherCache(
  lat: number,
  lon: number,
  days: WeatherDay[]
): Promise<void> {
  const latKey = roundCoord(lat);
  const lonKey = roundCoord(lon);

  const { error } = await supabase
    .from("weather_cache")
    .upsert(
      { lat_key: latKey, lon_key: lonKey, days, fetched_at: new Date().toISOString() },
      { onConflict: "lat_key,lon_key" }
    );

  if (error) {
    console.warn("[weatherCache] save failed:", error.message);
  }
}

/** Load the last cached forecast for a location. Returns null if nothing cached. */
export async function loadWeatherCache(
  lat: number,
  lon: number
): Promise<CachedWeather | null> {
  const latKey = roundCoord(lat);
  const lonKey = roundCoord(lon);

  const { data, error } = await supabase
    .from("weather_cache")
    .select("days, fetched_at")
    .eq("lat_key", latKey)
    .eq("lon_key", lonKey)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    days: data.days as WeatherDay[],
    fetchedAt: data.fetched_at as string,
  };
}
