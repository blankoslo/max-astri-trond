import type { WeatherDay, UtnoCabin } from '@/types';

/**
 * Fallback data constants and utilities for when external APIs are down.
 * Provides sensible default data so the UI can still function gracefully.
 */

/**
 * Generate 7 days of realistic Norwegian mountain weather starting from today.
 * Returns fallback forecast with varied but realistic values.
 */
export function getFallbackWeather(): WeatherDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: WeatherDay[] = [];

  const symbols = ['clearsky_day', 'partlycloudy_day', 'cloudy', 'rain'];
  const baseTemp = 8;

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    // Vary weather slightly through the week
    const symbolCode = symbols[Math.floor(Math.random() * symbols.length)];
    const tempVariation = Math.sin((i / 7) * Math.PI) * 4; // 0 to 4°C variation
    const tempMin = Math.round((baseTemp - 3 + tempVariation) * 10) / 10;
    const tempMax = Math.round((baseTemp + 4 + tempVariation) * 10) / 10;
    const precipMm = Math.round(Math.random() * 3 * 10) / 10; // 0-3mm
    const windMs = Math.round((3 + Math.random() * 5) * 10) / 10; // 3-8 m/s

    const emoji = getWeatherEmoji(symbolCode);
    const summary = `${Math.round(tempMax)}°C, ${emoji}`;

    days.push({
      date: dateStr,
      symbolCode,
      tempMin,
      tempMax,
      precipMm,
      windMs,
      summary,
    });
  }

  return days;
}

/**
 * Fallback empty cabins list.
 */
export const FALLBACK_CABINS: UtnoCabin[] = [];

/**
 * Map symbol code to emoji for display.
 */
function getWeatherEmoji(symbolCode: string): string {
  const map: Record<string, string> = {
    'clearsky_day': '☀️',
    'clearsky_night': '🌙',
    'partlycloudy_day': '⛅',
    'partlycloudy_night': '🌤️',
    'cloudy': '☁️',
    'rain': '🌧️',
    'rainsnow': '🌨️',
    'snow': '❄️',
    'thunderstorm': '⛈️',
  };
  return map[symbolCode] ?? '🌤️';
}
