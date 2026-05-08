import type { WeatherDay } from "@/types";

/**
 * Yr LocationForecast API response structure (simplified)
 */
interface YrTimeseries {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
        wind_speed: number;
      };
    };
    next_12_hours?: {
      summary: {
        symbol_code: string;
      };
      details: {
        precipitation_amount: number;
      };
    };
  };
}

interface YrResponse {
  properties: {
    timeseries: YrTimeseries[];
  };
}

/**
 * Map Yr symbol codes to emoji
 */
export function getWeatherEmoji(symbolCode: string): string {
  const code = symbolCode.toLowerCase();

  // Clear sky
  if (code.includes("clearsky")) return "☀️";
  // Fair weather
  if (code.includes("fair")) return "🌤️";
  // Partly cloudy
  if (code.includes("partlycloudy")) return "⛅";
  // Cloudy
  if (code.includes("cloudy")) return "☁️";
  // Rain variants
  if (code.includes("heavyrain")) return "🌧️";
  if (code.includes("lightrain")) return "🌦️";
  if (code.includes("rain")) return "🌧️";
  // Snow
  if (code.includes("snow")) return "❄️";
  // Sleet
  if (code.includes("sleet")) return "🌨️";
  // Fog
  if (code.includes("fog")) return "🌫️";
  // Thunderstorm
  if (code.includes("thunderstorm")) return "⛈️";

  return "🌡️";
}

/**
 * Fetch 7-day weather forecast from Yr/MET Norway API
 * Requires User-Agent header
 */
export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherDay[]> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
    });

    const response = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?${params.toString()}`,
      {
        headers: {
          "User-Agent": "Friluftskompis/0.1 kontakt@friluftskompis.no",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yr API error: ${response.status}`);
    }

    const data: YrResponse = await response.json();

    // Group hourly data by day
    const dayMap = new Map<string, YrTimeseries[]>();

    for (const entry of data.properties.timeseries) {
      const date = entry.time.split("T")[0]; // Extract YYYY-MM-DD
      if (!dayMap.has(date)) {
        dayMap.set(date, []);
      }
      dayMap.get(date)!.push(entry);
    }

    // Convert to WeatherDay[], limiting to 7 days
    const days: WeatherDay[] = [];

    for (const [date, entries] of Array.from(dayMap.entries()).slice(0, 7)) {
      // Use the noon entry (around 12:00) or first available entry
      const noonEntry = entries.find((e) => {
        const hour = new Date(e.time).getHours();
        return hour === 12;
      }) || entries[0];

      if (!noonEntry) continue;

      // Extract data
      const tempMin = Math.min(
        ...entries.map((e) => e.data.instant.details.air_temperature)
      );
      const tempMax = Math.max(
        ...entries.map((e) => e.data.instant.details.air_temperature)
      );

      const windMs = noonEntry.data.instant.details.wind_speed;
      const symbolCode = noonEntry.data.next_12_hours?.summary.symbol_code || "";
      const precipMm =
        noonEntry.data.next_12_hours?.details.precipitation_amount || 0;

      days.push({
        date,
        symbolCode,
        tempMin: Math.round(tempMin * 10) / 10,
        tempMax: Math.round(tempMax * 10) / 10,
        precipMm: Math.round(precipMm * 10) / 10,
        windMs: Math.round(windMs * 10) / 10,
        summary: `${Math.round(tempMax)}°C, ${getWeatherEmoji(symbolCode)}`,
      });
    }

    return days;
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    throw error;
  }
}
