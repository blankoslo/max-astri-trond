"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTripStore } from "@/store/tripStore";
import type { UtnoTrip, TripGrading, TripActivityType } from "@/types";
import type { AutocompleteResult } from "@/lib/apis/utno";

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
  area: string | null;       // display label
  areaId: number | null;     // numeric UT.no ID (from autocomplete)
  grading: TripGrading | null;
  maxHours: number | null;
}

const DEFAULT_FILTERS: Filters = { area: null, areaId: null, grading: null, maxHours: null };

// ─── Grading config ───────────────────────────────────────────────────────────

const GRADINGS: { value: TripGrading; label: string; color: string }[] = [
  { value: "EASY",       label: "Enkel",    color: "var(--color-success)" },
  { value: "MODERATE",   label: "Moderat",  color: "var(--color-warning)" },
  { value: "TOUGH",      label: "Krevende", color: "var(--color-error)"   },
  { value: "VERY_TOUGH", label: "Tøff",     color: "var(--color-error)"   },
];

const GRADING_MAP = Object.fromEntries(GRADINGS.map((g) => [g.value, g]));

// ─── Duration options ─────────────────────────────────────────────────────────

const DURATIONS: { label: string; value: number | null }[] = [
  { label: "Alle",  value: null },
  { label: "< 2 t", value: 2   },
  { label: "< 4 t", value: 4   },
  { label: "< 8 t", value: 8   },
];

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtDistance(m: number | null): string | null {
  if (!m) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function fmtDuration(hours: number | null, minutes: number | null): string | null {
  if (!hours && !minutes) return null;
  if (hours && minutes)   return `${hours} t ${minutes} min`;
  if (hours)              return `${hours} t`;
  return `${minutes} min`;
}

// ─── Build fetch URL ──────────────────────────────────────────────────────────

function buildUrl(filters: Filters, season: Season): string {
  const p = new URLSearchParams({ limit: "12" });

  if (filters.areaId != null) {
    p.set("areaId", String(filters.areaId));
  } else if (filters.area) {
    p.set("area", filters.area);
  }

  if (filters.grading) p.set("grading", filters.grading);
  if (filters.maxHours != null) p.set("maxHours", String(filters.maxHours));

  // Only apply season activity type when no other area/grading filter is active
  if (!filters.area && !filters.areaId && !filters.grading) {
    p.set("activityType", season.activityType);
  }

  return `/api/trips?${p.toString()}`;
}

// ─── Chip button ──────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0"
      style={{
        background: active ? "var(--color-brand-400)" : "var(--color-neutral-100)",
        color:      active ? "var(--color-white)"     : "var(--color-neutral-500)",
        border:     active ? "1px solid var(--color-brand-400)" : "1px solid transparent",
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
  const season = getSeason();

  // ── Search state ────────────────────────────────────────────────────────────
  const [query, setQuery]       = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [sugOpen, setSugOpen]   = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef   = useRef<HTMLDivElement>(null);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // ── Trip results ─────────────────────────────────────────────────────────────
  const [trips, setTrips]     = useState<UtnoTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const { setMapTarget, setSelectedPlace } = useTripStore();

  // ── Autocomplete fetch ───────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setSugOpen(false); return; }
    setSugLoading(true);
    try {
      const res  = await fetch(`/api/trips/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.results ?? []);
      setSugOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSugLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) {
      // Clear area filter when query is wiped
      setFilters((f) => ({ ...f, area: null, areaId: null }));
      setSuggestions([]);
      setSugOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 280);
  };

  const handleClearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setSugOpen(false);
    setFilters((f) => ({ ...f, area: null, areaId: null }));
  };

  // Pick a suggestion
  const pickSuggestion = (s: AutocompleteResult) => {
    setSugOpen(false);
    setSuggestions([]);

    if (s.type === "trip") {
      // Fly to the trip on the map immediately
      setQuery(s.name);
      setMapTarget({ lat: s.lat, lng: s.lng, zoom: 13 });
      setSelectedPlace({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, type: "trip" });
    } else {
      // Area — filter the list
      setQuery(s.name);
      setFilters((f) => ({ ...f, area: s.name, areaId: null }));
    }
  };

  // Close suggestions on outside click
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
    setLoading(true);
    setError(null);

    (async () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function handleShowOnMap(trip: UtnoTrip) {
    if (!trip.startPointGeojson) return;
    const [lng, lat] = trip.startPointGeojson.coordinates;
    setMapTarget({ lat, lng, zoom: 13 });
    setSelectedPlace({ id: String(trip.id), name: trip.name, lat, lng, type: "trip" });
  }

  const activeFiltersCount =
    (filters.area ? 1 : 0) + (filters.grading ? 1 : 0) + (filters.maxHours != null ? 1 : 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden"
      style={{
        width: 320,
        maxHeight: "calc(100vh - 80px)",
        border: "1px solid var(--color-border-default)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{season.emoji}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-neutral-600)" }}
          >
            Turer
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "var(--color-brand-100)",
            color:      "var(--color-brand-500)",
          }}
        >
          {season.label}
        </span>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
        ref={searchRef}
      >
        <div className="relative">
          {/* Search icon */}
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
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
            className="w-full pl-7 pr-7 py-1.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2"
            style={{
              background:  "var(--color-neutral-100)",
              color:        "var(--color-neutral-600)",
              fontSize:     "13px",
              // @ts-expect-error ring color via css var
              "--tw-ring-color": "var(--color-brand-400)",
            }}
          />

          {/* Clear / loading */}
          {sugLoading && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div
                className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }}
              />
            </div>
          )}
          {!sugLoading && query && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full hover:opacity-70"
              style={{ background: "var(--color-neutral-200)" }}
              aria-label="Tøm søk"
            >
              <svg className="w-2.5 h-2.5" style={{ color: "var(--color-neutral-500)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {sugOpen && suggestions.length > 0 && (
          <div
            className="absolute left-3 right-3 mt-1 rounded-lg shadow-xl overflow-hidden z-50"
            style={{
              background: "white",
              border: "1px solid var(--color-border-default)",
              top: "auto",
            }}
          >
            {suggestions.map((s) => (
              <button
                key={`${s.type}-${s.id}`}
                onClick={() => pickSuggestion(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b last:border-b-0"
                style={{ borderColor: "var(--color-border-default)" }}
              >
                <span className="text-base shrink-0">
                  {s.type === "trip" ? "🥾" : "📍"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-neutral-600)" }}>
                    {s.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
                    {s.type === "trip" ? "Tur" : "Område"}
                    {s.category ? ` · ${s.category}` : ""}
                  </p>
                </div>
                {s.type === "trip" && (
                  <span
                    className="ml-auto text-xs shrink-0"
                    style={{ color: "var(--color-brand-400)" }}
                  >
                    Vis kart →
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div
        className="px-3 py-2 flex flex-col gap-2 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        {/* Grading */}
        <div>
          <p className="text-xs mb-1.5" style={{ color: "var(--color-neutral-300)" }}>
            Vanskelighetsgrad
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <Chip active={filters.grading === null} onClick={() => setFilters((f) => ({ ...f, grading: null }))}>
              Alle
            </Chip>
            {GRADINGS.map((g) => (
              <Chip
                key={g.value}
                active={filters.grading === g.value}
                dot={g.color}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    grading: f.grading === g.value ? null : g.value,
                  }))
                }
              >
                {g.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <p className="text-xs mb-1.5" style={{ color: "var(--color-neutral-300)" }}>
            Varighet
          </p>
          <div className="flex gap-1.5">
            {DURATIONS.map((d) => (
              <Chip
                key={d.label}
                active={filters.maxHours === d.value}
                onClick={() => setFilters((f) => ({ ...f, maxHours: d.value }))}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active filter summary ──────────────────────────────────────────── */}
      {activeFiltersCount > 0 && (
        <div
          className="px-3 py-1.5 flex items-center justify-between shrink-0"
          style={{
            background: "var(--color-brand-100)",
            borderBottom: "1px solid var(--color-brand-200)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--color-brand-500)" }}>
            {activeFiltersCount} filter{activeFiltersCount > 1 ? "e" : ""} aktiv{activeFiltersCount > 1 ? "e" : "t"}
          </span>
          <button
            onClick={() => { setFilters(DEFAULT_FILTERS); setQuery(""); }}
            className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--color-brand-500)" }}
          >
            Nullstill
          </button>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }}
            />
            <span className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
              Henter turer…
            </span>
          </div>
        )}

        {!loading && error && (
          <p className="p-4 text-sm text-center" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 px-4 text-center">
            <span className="text-2xl">🏔️</span>
            <p className="text-sm" style={{ color: "var(--color-neutral-400)" }}>
              Ingen turer matcher søket ditt.
            </p>
            <button
              onClick={() => { setFilters(DEFAULT_FILTERS); setQuery(""); }}
              className="mt-1 text-xs font-medium underline underline-offset-2"
              style={{ color: "var(--color-brand-400)" }}
            >
              Nullstill filter
            </button>
          </div>
        )}

        {!loading && !error && trips.length > 0 && (
          <ul
            className="divide-y"
            style={{ borderColor: "var(--color-border-default)" }}
          >
            {trips.map((trip) => {
              const dist     = fmtDistance(trip.distance);
              const duration = fmtDuration(trip.durationHours, trip.durationMinutes);
              const grading  = trip.grading ? GRADING_MAP[trip.grading] : null;
              const area     = trip.areas[0]?.name ?? trip.counties[0]?.name ?? null;
              const canMap   = !!trip.startPointGeojson;

              return (
                <li
                  key={trip.id}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{ color: "var(--color-neutral-600)" }}
                  >
                    {trip.name}
                  </p>

                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    {grading && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "var(--color-neutral-400)" }}
                      >
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ background: grading.color }}
                        />
                        {grading.label}
                      </span>
                    )}
                    {dist && (
                      <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
                        {dist}
                      </span>
                    )}
                    {duration && (
                      <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
                        {duration}
                      </span>
                    )}
                    {area && (
                      <span className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
                        {area}
                      </span>
                    )}
                  </div>

                  {canMap && (
                    <button
                      onClick={() => handleShowOnMap(trip)}
                      className="mt-1 self-start text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
                      style={{ color: "var(--color-brand-400)" }}
                    >
                      Vis på kart →
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
