"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UtnoTrip, TripGrading, TripActivityType } from "@/types";
import type { AutocompleteResult } from "@/lib/apis/utno";
import AiBadge from "@/components/ui/AiBadge";

// ─── Season ───────────────────────────────────────────────────────────────────

interface Season {
  label: string;
  emoji: string;
  activityType: TripActivityType;
}

function getSeason(): Season {
  const m = new Date().getMonth() + 1;
  if (m >= 12 || m <= 2) return { label: "Vinter", emoji: "❄️", activityType: "SKI_TOURING" };
  if (m <= 5)            return { label: "Vår",    emoji: "🌿", activityType: "HIKING" };
  if (m <= 8)            return { label: "Sommer", emoji: "☀️", activityType: "HIKING" };
  return                        { label: "Høst",   emoji: "🍂", activityType: "HIKING" };
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters {
  area: string | null;
  areaId: number | null;
  grading: TripGrading | null;
  maxHours: number | null;
  multiDay: boolean;
}

const DEFAULT_FILTERS: Filters = {
  area: null, areaId: null, grading: null, maxHours: null, multiDay: false,
};

// ─── Config ───────────────────────────────────────────────────────────────────

const GRADINGS: { value: TripGrading; label: string; color: string }[] = [
  { value: "EASY",       label: "Enkel",    color: "var(--color-success)" },
  { value: "MODERATE",   label: "Moderat",  color: "var(--color-warning)" },
  { value: "TOUGH",      label: "Krevende", color: "var(--color-error)"   },
  { value: "VERY_TOUGH", label: "Tøff",     color: "var(--color-error)"   },
];
const GRADING_MAP = Object.fromEntries(GRADINGS.map((g) => [g.value, g]));

const DURATIONS: { label: string; value: number | null; multiDay?: boolean }[] = [
  { label: "Alle",     value: null },
  { label: "< 2 t",   value: 2    },
  { label: "< 4 t",   value: 4    },
  { label: "< 8 t",   value: 8    },
  { label: "Flerdag", value: null, multiDay: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDistance(m: number | null): string | null {
  if (m == null) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function fmtDuration(hours: number | null, minutes: number | null): string | null {
  if (!hours && !minutes) return null;
  if (hours && minutes) return `${hours} t ${minutes} min`;
  if (hours) return `${hours} t`;
  return `${minutes} min`;
}

function buildUrl(filters: Filters, season: Season): string {
  const p = new URLSearchParams({ limit: "20" });
  if (filters.areaId != null) p.set("areaId", String(filters.areaId));
  else if (filters.area) p.set("area", filters.area);
  if (filters.grading) p.set("grading", filters.grading);
  if (filters.maxHours != null) p.set("maxHours", String(filters.maxHours));
  if (filters.multiDay) p.set("minDays", "1");
  if (!filters.area && !filters.areaId && !filters.grading && !filters.multiDay) {
    p.set("activityType", season.activityType);
  }
  return `/api/trips?${p.toString()}`;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  active, onClick, children, dot,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0"
      style={{
        background: active ? "var(--color-brand-500)" : "white",
        color:      active ? "white"                   : "var(--color-neutral-500)",
        border:     active
          ? "1.5px solid var(--color-brand-500)"
          : "1.5px solid var(--color-border-default)",
      }}
    >
      {dot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: active ? "white" : dot }}
        />
      )}
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TripSuggestions() {
  const router = useRouter();
  const season = getSeason();

  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [sugOpen, setSugOpen]         = useState(false);
  const [sugLoading, setSugLoading]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef   = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [trips, setTrips]     = useState<UtnoTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Autocomplete ─────────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setSugOpen(false); return; }
    setSugLoading(true);
    try {
      const res  = await fetch(`/api/trips/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.results ?? []);
      setSugOpen(true);
    } catch { setSuggestions([]); }
    finally { setSugLoading(false); }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) {
      setFilters((f) => ({ ...f, area: null, areaId: null }));
      setSuggestions([]); setSugOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 280);
  };

  const handleClearSearch = () => {
    setQuery(""); setSuggestions([]); setSugOpen(false);
    setFilters((f) => ({ ...f, area: null, areaId: null }));
  };

  const pickSuggestion = (s: AutocompleteResult) => {
    setSugOpen(false); setSuggestions([]);
    if (s.type === "trip") {
      router.push(`/trips/${s.id}`);
    } else {
      setQuery(s.name);
      setFilters((f) => ({ ...f, area: s.name, areaId: null }));
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSugOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Trip fetch ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res  = await fetch(buildUrl(filters, season));
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setTrips(data.trips ?? []);
      } catch {
        if (!cancelled) setError("Klarte ikke laste turer. Prøv igjen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // season derived from new Date() — adding to deps re-triggers every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const activeFiltersCount =
    (filters.area ? 1 : 0) +
    (filters.grading ? 1 : 0) +
    (filters.maxHours != null ? 1 : 0) +
    (filters.multiDay ? 1 : 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* ── Search + filter bar ─────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex flex-col gap-3"
        style={{
          background: "white",
          borderBottom: "1px solid var(--color-border-default)",
        }}
      >
        {/* Search input */}
        <div className="relative max-w-2xl" ref={searchRef}>
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--color-neutral-300)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => suggestions.length > 0 && setSugOpen(true)}
            placeholder="Søk sted, område eller tur…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2"
            style={{
              background: "var(--color-neutral-100)",
              color: "var(--color-neutral-600)",
              // @ts-expect-error css var
              "--tw-ring-color": "var(--color-brand-400)",
            }}
          />
          {sugLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }} />
            </div>
          )}
          {!sugLoading && query && (
            <button onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:opacity-70"
              style={{ background: "var(--color-neutral-200)" }}>
              <svg className="w-3 h-3" style={{ color: "var(--color-neutral-500)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Autocomplete dropdown */}
          {sugOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden z-50"
              style={{ background: "white", border: "1px solid var(--color-border-default)" }}>
              {suggestions.map((s) => (
                <button key={`${s.type}-${s.id}`} onClick={() => pickSuggestion(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: "var(--color-border-default)" }}>
                  <span className="text-lg shrink-0">{s.type === "trip" ? "🥾" : "📍"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-neutral-600)" }}>
                      {s.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
                      {s.type === "trip" ? "Tur" : "Område"}{s.category ? ` · ${s.category}` : ""}
                    </p>
                  </div>
                  {s.type === "trip" && (
                    <span className="text-xs shrink-0" style={{ color: "var(--color-brand-400)" }}>
                      Åpne →
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-4">
          {/* Grading */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium mr-0.5" style={{ color: "var(--color-neutral-300)" }}>
              Vanskelighet:
            </span>
            <Chip active={filters.grading === null} onClick={() => setFilters((f) => ({ ...f, grading: null }))}>
              Alle
            </Chip>
            {GRADINGS.map((g) => (
              <Chip key={g.value} active={filters.grading === g.value} dot={g.color}
                onClick={() => setFilters((f) => ({ ...f, grading: f.grading === g.value ? null : g.value }))}>
                {g.label}
              </Chip>
            ))}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium mr-0.5" style={{ color: "var(--color-neutral-300)" }}>
              Varighet:
            </span>
            {DURATIONS.map((d) => (
              <Chip key={d.label}
                active={d.multiDay ? filters.multiDay : !filters.multiDay && filters.maxHours === d.value}
                onClick={() =>
                  d.multiDay
                    ? setFilters((f) => ({ ...f, multiDay: !f.multiDay, maxHours: null }))
                    : setFilters((f) => ({ ...f, multiDay: false, maxHours: d.value }))
                }>
                {d.label}
              </Chip>
            ))}
          </div>

          {/* Reset */}
          {activeFiltersCount > 0 && (
            <button onClick={() => { setFilters(DEFAULT_FILTERS); setQuery(""); }}
              className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: "var(--color-brand-400)" }}>
              Nullstill ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Season badge + result count */}
        <div className="flex items-center gap-2">
          <span className="text-sm">{season.emoji}</span>
          <span className="text-sm font-medium" style={{ color: "var(--color-neutral-500)" }}>
            {season.label}
          </span>
          {!loading && trips.length > 0 && (
            <span className="text-xs ml-1" style={{ color: "var(--color-neutral-300)" }}>
              · {trips.length} turer
            </span>
          )}
        </div>

        {/* Data source badge */}
        {!loading && trips.length > 0 && (
          <div>
            <AiBadge variant="factual" source="UT.no" />
          </div>
        )}
      </div>

      {/* ── Results grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }} />
            <span className="text-sm" style={{ color: "var(--color-neutral-300)" }}>Henter turer…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-20">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20">
            <span className="text-4xl">🏔️</span>
            <p className="text-sm" style={{ color: "var(--color-neutral-400)" }}>
              Ingen turer matcher søket ditt.
            </p>
            <button onClick={() => { setFilters(DEFAULT_FILTERS); setQuery(""); }}
              className="text-sm font-medium underline underline-offset-2"
              style={{ color: "var(--color-brand-400)" }}>
              Nullstill filter
            </button>
          </div>
        )}

        {!loading && !error && trips.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
            {trips.map((trip) => {
              const dist       = fmtDistance(trip.distance);
              const duration   = fmtDuration(trip.durationHours, trip.durationMinutes);
              const grading    = trip.grading ? GRADING_MAP[trip.grading] : null;
              const area       = trip.areas[0]?.name ?? trip.counties[0]?.name ?? null;
              const isMultiDay = (trip.durationDays ?? 0) > 1;
              const coverImg   = trip.media.find((m) => m.type === "image")?.uri ?? null;

              return (
                <div
                  key={trip.id}
                  className="flex flex-col rounded-2xl overflow-hidden transition-all hover:shadow-md cursor-pointer"
                  style={{
                    background: "white",
                    border: "1px solid var(--color-border-default)",
                  }}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                >
                  {/* Cover image */}
                  <div
                    className="h-40 shrink-0"
                    style={{
                      background: coverImg
                        ? `url(${coverImg}) center/cover no-repeat`
                        : "linear-gradient(135deg, var(--color-brand-100), var(--color-brand-200))",
                    }}
                  >
                    {!coverImg && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-40">🏔️</span>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col gap-2 p-4 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-semibold leading-snug flex-1"
                        style={{ color: "var(--color-neutral-600)" }}>
                        {trip.name}
                      </p>
                      {isMultiDay && (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: "var(--color-brand-100)", color: "var(--color-brand-500)" }}>
                          {trip.durationDays}d
                        </span>
                      )}
                    </div>

                    {/* Meta pills */}
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                      {grading && (
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--color-neutral-400)" }}>
                          <span className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ background: grading.color }} />
                          {grading.label}
                        </span>
                      )}
                      {dist && (
                        <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>{dist}</span>
                      )}
                      {duration && (
                        <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>{duration}</span>
                      )}
                      {area && (
                        <span className="text-xs" style={{ color: "var(--color-neutral-300)" }}>{area}</span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto pt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/trips/${trip.id}`); }}
                        className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ background: "var(--color-brand-500)", color: "white" }}
                      >
                        Velg tur →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
