import type { WeatherDay } from "@/types";
import { getWeatherEmoji } from "@/lib/apis/yr";
import AiBadge from "@/components/ui/AiBadge";

/**
 * Norwegian day abbreviations
 */
const DAY_NAMES = ["Son", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

interface WeatherForecastProps {
  days: WeatherDay[];
  showBadge?: boolean;
}

export default function WeatherForecast({ days, showBadge = true }: WeatherForecastProps) {
  if (!days || days.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 text-sm">
        Ingen værdata tilgjengelig
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showBadge && (
        <div>
          <AiBadge variant="factual" source="Yr / MET Norway" />
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((day) => {
        const date = new Date(day.date + "T00:00:00");
        const dayName = DAY_NAMES[date.getDay()];
        const dayOfMonth = date.getDate();
        const emoji = getWeatherEmoji(day.symbolCode);

        return (
          <div
            key={day.date}
            className="flex-shrink-0 w-20 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center hover:bg-slate-100 transition-colors"
          >
            {/* Day and date */}
            <div className="text-xs font-semibold text-slate-700">
              {dayName}
            </div>
            <div className="text-xs text-slate-500">{dayOfMonth}</div>

            {/* Weather emoji */}
            <div className="text-2xl my-2">{emoji}</div>

            {/* Temperature range */}
            <div className="text-xs font-medium text-slate-900 mb-1">
              {Math.round(day.tempMin)}–{Math.round(day.tempMax)}°
            </div>

            {/* Precipitation (if > 0) */}
            {day.precipMm > 0 && (
              <div className="text-xs text-blue-600 font-medium">
                💧 {day.precipMm}mm
              </div>
            )}

            {/* Wind */}
            <div className="text-xs text-slate-600 mt-1">{day.windMs} m/s</div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
