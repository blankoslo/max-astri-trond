"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { UtnoTrip, UtnoCabin, WeatherDay } from "@/types";
import { useTripStore } from "@/store/tripStore";
import { PackingListSchema } from "@/lib/ai/prompts";
import WeatherForecast from "@/components/weather/WeatherForecast";
import AiBadge from "@/components/ui/AiBadge";
import { ChevronDown, RefreshCw } from "lucide-react";
import OfflineDownloadButton from "@/components/offline/OfflineDownloadButton";
import InviteModal from "@/components/invite/InviteModal";
import ExpensePanel from "@/components/expenses/ExpensePanel";
import {
  type Participant,
  getParticipants,
  addParticipant,
  hasJoinedLocally,
  getMyParticipantId,
  leaveTrip,
} from "@/lib/participants";
import { supabase } from "@/lib/supabase";

const TripMap = dynamic(() => import("@/components/trip-detail/TripMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: "#e8edf2" }}>
      <div className="flex flex-col items-center gap-2 opacity-50">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }} />
        <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>Laster kart…</span>
      </div>
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stage {
  day: number;
  startName: string;
  endName: string;
  distanceKm: number;
  estimatedHours: number;
  isOvernight: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradingLabel(g: string | null) {
  switch (g) {
    case "EASY":       return "Enkel";
    case "MODERATE":   return "Moderat";
    case "TOUGH":      return "Krevende";
    case "VERY_TOUGH": return "Meget krevende";
    default:           return "";
  }
}

function gradingColor(g: string | null) {
  switch (g) {
    case "EASY":       return "var(--color-success)";
    case "MODERATE":   return "var(--color-warning)";
    case "TOUGH":
    case "VERY_TOUGH": return "var(--color-error)";
    default:           return "var(--color-neutral-300)";
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Daily itinerary algorithm (F7 / B3 / B6) ────────────────────────────────

function buildItinerary(trip: UtnoTrip, cabins: UtnoCabin[]): Stage[] {
  const coords = trip.geojson?.coordinates ?? [];
  if (coords.length < 2) return [];

  const numDays = trip.durationDays ?? Math.max(1, Math.ceil((trip.distance ?? 10000) / 15000));

  // Cumulative distances along route (Haversine)
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    cumDist.push(cumDist[i - 1] + 2 * R * Math.asin(Math.sqrt(a)));
  }
  const totalDist = cumDist[cumDist.length - 1];

  if (numDays === 1) {
    return [{
      day: 1,
      startName: "Startpunkt",
      endName: "Endepunkt",
      distanceKm: Math.round((totalDist / 1000) * 10) / 10,
      estimatedHours: Math.round(((totalDist / 1000) / 3.5) * 10) / 10,
      isOvernight: false,
    }];
  }

  // Project each cabin onto route → find nearest coord index
  const cabinsWithIdx = cabins
    .filter((c) => c.geojson?.coordinates)
    .map((c) => {
      const [clon, clat] = c.geojson!.coordinates;
      let minD = Infinity, minIdx = 0;
      coords.forEach(([rlon, rlat], i) => {
        const d = Math.hypot(clon - rlon, clat - rlat);
        if (d < minD) { minD = d; minIdx = i; }
      });
      return { cabin: c, routeIdx: minIdx, cumDistAtIdx: cumDist[minIdx] };
    })
    .sort((a, b) => a.routeIdx - b.routeIdx);

  // Pick N-1 overnight stops, evenly distributed
  const stops: Array<{ name: string; dist: number }> = [];
  for (let k = 1; k < numDays; k++) {
    const target = (totalDist * k) / numDays;
    let best = cabinsWithIdx[0];
    let bestDiff = Infinity;
    for (const c of cabinsWithIdx) {
      const diff = Math.abs(c.cumDistAtIdx - target);
      if (diff < bestDiff) { bestDiff = diff; best = c; }
    }
    if (best) stops.push({ name: best.cabin.name, dist: best.cumDistAtIdx });
  }

  // Build stage objects
  const waypoints = [
    { name: "Startpunkt", dist: 0 },
    ...stops,
    { name: "Endepunkt", dist: totalDist },
  ];

  return waypoints.slice(0, -1).map((wp, i) => {
    const segDist = waypoints[i + 1].dist - wp.dist;
    const km = Math.round((segDist / 1000) * 10) / 10;
    return {
      day: i + 1,
      startName: wp.name,
      endName: waypoints[i + 1].name,
      distanceKm: km,
      estimatedHours: Math.round(((segDist / 1000) / 3.5) * 10) / 10,
      isOvernight: i < waypoints.length - 2,
    };
  });
}

// ─── Small reusable sub-components ───────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-4 mt-4 p-5 rounded-2xl"
      style={{ background: "white", border: "1px solid var(--color-border-default)" }}>
      {children}
    </section>
  );
}

function SectionTitle({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span>{emoji}</span>
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--color-neutral-600)" }}>{title}</p>
        {sub && <p className="text-xs" style={{ color: "var(--color-neutral-300)" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface RouteParams { id: string }

export default function TripDetailPage({ params }: { params: Promise<RouteParams> }) {
  const router = useRouter();

  const [routeParams, setRouteParams] = useState<RouteParams | null>(null);
  const [trip,    setTrip]    = useState<UtnoTrip | null>(null);
  const [cabins,  setCabins]  = useState<UtnoCabin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [startDate, setStartDate] = useState(todayIso);
  const [groupSize, setGroupSize] = useState(2);
  const [weather,   setWeather]   = useState<WeatherDay[]>([]);
  const [weatherFallback, setWeatherFallback] = useState(false);
  const [weatherCachedAt,  setWeatherCachedAt]  = useState<string | null>(null);
  const [daySummaries,        setDaySummaries]        = useState<string[]>([]);
  const [daySummariesLoading, setDaySummariesLoading] = useState(false);
  const summaryFetchedForRef = useRef<string | null>(null); // avoid duplicate fetches
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [packingExpanded, setPackingExpanded] = useState(true);
  const packingAbortRef = useRef<AbortController | null>(null);

  // ── Invite / participants ────────────────────────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");

  const {
    clearPacking,
    packingItems, packingLoading, packingError,
    setPackingItems, setPackingLoading, setPackingError,
    packedItemKeys, togglePackedItem,
  } = useTripStore();

  useEffect(() => { params.then(setRouteParams); }, [params]);

  // Fetch trip + cabins in parallel
  useEffect(() => {
    if (!routeParams?.id) return;
    setLoading(true); setError(null);
    (async () => {
      try {
        const [tripRes, cabinRes] = await Promise.all([
          fetch(`/api/trips/${routeParams.id}`),
          fetch(`/api/trips/${routeParams.id}/cabins?interval=5000&radius=3000`),
        ]);
        if (!tripRes.ok) throw new Error("Fant ikke turen");
        const tripData: UtnoTrip = await tripRes.json();
        setTrip(tripData);
        if (cabinRes.ok) setCabins((await cabinRes.json()).cabins ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    })();
  }, [routeParams?.id]);

  // Fetch 5-day weather for trip start point
  useEffect(() => {
    if (!trip?.startPointGeojson?.coordinates) return;
    setWeatherLoading(true);
    const [lng, lat] = trip.startPointGeojson.coordinates;
    fetch(`/api/weather?lat=${lat}&lon=${lng}`)
      .then((r) => {
        const source = r.headers.get('X-Data-Source');
        const cachedAt = r.headers.get('X-Cache-Fetched-At');
        setWeatherFallback(source === 'fallback' || source === 'cache');
        setWeatherCachedAt(source === 'cache' && cachedAt ? cachedAt : null);
        return r.ok ? r.json() : Promise.reject();
      })
      .then((days: WeatherDay[]) => setWeather(days.slice(0, 5)))
      .catch(() => {
        setWeatherFallback(false);
        setWeatherCachedAt(null);
      })
      .finally(() => setWeatherLoading(false));
  }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load participants from Supabase + subscribe to real-time changes
  useEffect(() => {
    if (!routeParams?.id) return;
    const tripId = routeParams.id;

    // Initial load
    getParticipants(tripId).then((rows) => {
      setParticipants(rows);
      setAlreadyJoined(hasJoinedLocally(tripId));
    });

    // Real-time subscription — fires on INSERT / UPDATE / DELETE
    const channel = supabase
      .channel(`participants:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // Re-fetch the full list on any change
          getParticipants(tripId).then((rows) => {
            setParticipants(rows);
            setAlreadyJoined(hasJoinedLocally(tripId));
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [routeParams?.id]);

  const stages = useMemo(() => (trip ? buildItinerary(trip, cabins) : []), [trip, cabins]);

  // Fetch AI day summaries once stages are ready
  useEffect(() => {
    if (!trip || stages.length === 0) return;
    // Use a key so we don't re-fetch when e.g. groupSize changes
    const key = `${trip.id}-${stages.length}`;
    if (summaryFetchedForRef.current === key) return;
    summaryFetchedForRef.current = key;

    setDaySummariesLoading(true);
    const weatherSummaries = weather.slice(0, stages.length).map((w) => w.summary);
    fetch("/api/ai/day-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripName: trip.name,
        area: trip.areas[0]?.name ?? trip.counties[0]?.name ?? null,
        grading: trip.grading,
        stages,
        weatherSummaries,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((summaries: string[]) => setDaySummaries(summaries))
      .catch(() => {}) // summaries are decorative — fail silently
      .finally(() => setDaySummariesLoading(false));
  }, [trip?.id, stages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGeneratePacking = useCallback(async () => {
    if (!trip) return;
    clearPacking();
    setPackingLoading(true);
    setPackingError(null);
    setPackingExpanded(true);

    if (packingAbortRef.current) packingAbortRef.current.abort();
    packingAbortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationName: trip.name,
          startDate,
          nights: Math.max(1, (trip.durationDays ?? 2) - 1),
          groupSize,
          hasKids: false,
          experience: "intermediate",
        }),
        signal: packingAbortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Feil: ${res.status}`);
      }

      const validated = PackingListSchema.parse(await res.json());
      setPackingItems(validated);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPackingError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setPackingLoading(false);
    }
  }, [trip, startDate, groupSize, clearPacking, setPackingItems, setPackingLoading, setPackingError]);

  const handleJoin = useCallback(async () => {
    if (!routeParams?.id) return;
    const name = joinName.trim();
    if (!name) { setJoinError("Skriv inn navnet ditt"); return; }
    try {
      await addParticipant(routeParams.id, name);
      // Real-time subscription will refresh the list automatically
      setAlreadyJoined(true);
      setJoinName("");
      setJoinError("");
    } catch {
      setJoinError("Noe gikk galt. Prøv igjen.");
    }
  }, [routeParams?.id, joinName]);

  const handleLeave = useCallback(async () => {
    if (!routeParams?.id) return;
    await leaveTrip(routeParams.id);
    setAlreadyJoined(false);
    // Real-time subscription will refresh the list automatically
  }, [routeParams?.id]);

  // ── Loading / error ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f9fb" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "var(--color-neutral-400)" }}>Laster tur…</p>
      </div>
    </div>
  );

  if (error || !trip) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#f8f9fb" }}>
      <span className="text-4xl">⚠️</span>
      <p className="text-sm" style={{ color: "var(--color-neutral-500)" }}>{error ?? "Turen ble ikke funnet"}</p>
      <button onClick={() => router.back()}
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: "var(--color-brand-500)", color: "white" }}>
        ← Tilbake
      </button>
    </div>
  );

  const distKm  = trip.distance  ? Math.round((trip.distance  / 1000) * 10) / 10 : null;
  const elevGain = trip.elevationGain ? Math.round(trip.elevationGain / 10) * 10 : null;
  const area    = trip.areas[0]?.name ?? trip.counties[0]?.name ?? null;

  return (
    <div className="min-h-screen pb-10" style={{ background: "#f8f9fb" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{ background: "white", borderBottom: "1px solid var(--color-border-default)",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <button onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Tilbake">
          <svg className="w-5 h-5" style={{ color: "var(--color-neutral-500)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate" style={{ color: "var(--color-neutral-600)" }}>
            {trip.name}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {distKm && <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>{distKm} km</span>}
            {trip.grading && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-neutral-400)" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: gradingColor(trip.grading) }} />
                {gradingLabel(trip.grading)}
              </span>
            )}
            {area && <span className="text-xs" style={{ color: "var(--color-neutral-300)" }}>{area}</span>}
          </div>
        </div>

        {/* Invite button */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all hover:opacity-85"
          style={{ background: "var(--color-brand-500)", color: "white" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Inviter
        </button>
      </header>

      <div className="max-w-2xl mx-auto">

        {/* ── Map (smaller, rounded) ────────────────────────────────────── */}
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm"
          style={{ height: 260, border: "1px solid var(--color-border-default)" }}>
          <TripMap trip={trip} cabins={cabins} />
        </div>

        {/* ── Quick stat pills ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 px-4 mt-3">
          {elevGain && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "white", border: "1px solid var(--color-border-default)", color: "var(--color-neutral-500)" }}>
              ⬆️ {elevGain} m
            </span>
          )}
          {trip.durationDays && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "white", border: "1px solid var(--color-border-default)", color: "var(--color-neutral-500)" }}>
              🗓️ {trip.durationDays} {trip.durationDays === 1 ? "dag" : "dager"}
            </span>
          )}
          {cabins.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "white", border: "1px solid var(--color-border-default)", color: "var(--color-neutral-500)" }}>
              🛖 {cabins.length} hytter langs ruten
            </span>
          )}
        </div>

        {/* ── Dagsetapper — F7 / B3 / B6 ───────────────────────────────── */}
        {stages.length > 0 && (
          <SectionCard>
            <SectionTitle emoji="🗺️" title="Dagsetapper"
              sub={`${stages.length} etappe${stages.length !== 1 ? "r" : ""} · estimert gangtid`} />

            {/* Vertical timeline */}
            <div>
              {stages.map((stage, idx) => (
                <div key={stage.day} className="flex gap-3">
                  {/* Spine column */}
                  <div className="flex flex-col items-center" style={{ width: 24, flexShrink: 0 }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold z-10"
                      style={{
                        background: idx === 0 ? "#0f8402" : "var(--color-brand-500)",
                        color: "white", flexShrink: 0,
                      }}>
                      {idx === 0 ? "S" : idx}
                    </div>
                    {/* Line down to next */}
                    <div className="flex-1 w-px my-1"
                      style={{ background: "var(--color-border-default)", minHeight: 36 }} />
                  </div>

                  {/* Stage content */}
                  <div className="flex-1 pb-3">
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-neutral-300)" }}>
                      Dag {stage.day}
                    </p>
                    <div className="rounded-xl px-3 py-2.5"
                      style={{ background: "#f8f9fb", border: "1px solid var(--color-border-default)" }}>
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--color-neutral-600)" }}>
                        <span className="truncate">{stage.startName}</span>
                        <span style={{ color: "var(--color-neutral-300)" }}> → </span>
                        <span className="truncate">{stage.endName}</span>
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
                          📏 {stage.distanceKm} km
                        </span>
                        <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
                          ⏱️ ca. {stage.estimatedHours} t
                        </span>
                        {stage.isOvernight && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "var(--color-brand-100)", color: "var(--color-brand-500)" }}>
                            🛏 overnatting
                          </span>
                        )}
                      </div>

                      {/* AI day summary */}
                      {daySummariesLoading ? (
                        <div className="mt-2 h-3 rounded animate-pulse"
                          style={{ background: "var(--color-neutral-100)", width: "85%" }} />
                      ) : daySummaries[idx] ? (
                        <>
                          <p className="mt-2 text-xs leading-relaxed"
                            style={{ color: "var(--color-neutral-400)", fontStyle: "italic" }}>
                            {daySummaries[idx]}
                          </p>
                          <div className="mt-2">
                            <AiBadge variant="ai" source="Claude" />
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {/* Final destination marker */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex justify-center">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#bf0000", color: "white" }}>
                    M
                  </div>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--color-neutral-500)" }}>
                  {stages[stages.length - 1]?.endName ?? "Endepunkt"}
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Deltakere ─────────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle
            emoji="👥"
            title="Deltakere"
            sub={participants.length === 0 ? "Ingen har meldt seg på ennå" : `${participants.length} påmeldt`}
          />

          {/* Participant list */}
          {participants.length > 0 && (
            <ul className="flex flex-col gap-2 mb-4">
              {participants.map((p) => {
                const isMe = routeParams ? getMyParticipantId(routeParams.id) === p.id : false;
                return (
                  <li key={p.id} className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "var(--color-brand-100)", color: "var(--color-brand-500)" }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm flex-1" style={{ color: "var(--color-neutral-600)" }}>
                      {p.name}
                      {isMe && (
                        <span className="ml-1.5 text-xs font-medium"
                          style={{ color: "var(--color-neutral-300)" }}>(deg)</span>
                      )}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
                      {new Date(p.joined_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Join / Leave */}
          {alreadyJoined ? (
            <div className="flex items-center justify-between py-2 px-3 rounded-xl"
              style={{ background: "var(--color-success-light)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--color-success)" }}>
                ✓ Du er påmeldt denne turen
              </span>
              <button
                onClick={handleLeave}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--color-neutral-400)" }}
              >
                Meld av
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--color-neutral-400)" }}>
                Bli med på turen
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ditt navn"
                  value={joinName}
                  onChange={(e) => { setJoinName(e.target.value); setJoinError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                  style={{
                    borderColor: joinError ? "var(--color-error)" : "var(--color-border-default)",
                    color: "var(--color-neutral-600)",
                    // @ts-expect-error css var
                    "--tw-ring-color": "var(--color-brand-400)",
                  }}
                />
                <button
                  onClick={handleJoin}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: "var(--color-brand-500)", color: "white" }}
                >
                  Bli med
                </button>
              </div>
              {joinError && (
                <p className="text-xs mt-1" style={{ color: "var(--color-error)" }}>{joinError}</p>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Værvarselet — 5 dager ─────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle emoji="🌤️" title="Værvarselet" sub="5 dager fra startpunktet" />
          {weatherFallback && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2.5"
              style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}>
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-medium" style={{ color: "#b45309" }}>
                  Værvarselet er ikke tilgjengelig akkurat nå
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#92400e" }}>
                  {weatherCachedAt
                    ? `Viser lagret varsel fra ${new Date(weatherCachedAt).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Prøv igjen senere for oppdatert data.`
                    : "Ingen lagret varsel tilgjengelig. Viser eksempeldata."}
                </p>
              </div>
            </div>
          )}
          {weatherLoading ? (
            <div className="flex items-center gap-2 py-3">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }} />
              <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>Henter værvarselet…</span>
            </div>
          ) : weather.length > 0 ? (
            <WeatherForecast days={weather} />
          ) : (
            <p className="text-xs py-2" style={{ color: "var(--color-neutral-300)" }}>
              Ingen værdata tilgjengelig for dette området.
            </p>
          )}
        </SectionCard>

        {/* ── Planlegging ───────────────────────────────────────────────── */}
        <SectionCard>
          <SectionTitle emoji="📋" title="Planlegg turen" />

          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--color-neutral-400)" }}>Startdato</p>
            <input type="date" value={startDate} min={todayIso()}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border-default)", color: "var(--color-neutral-600)",
                // @ts-expect-error css var
                "--tw-ring-color": "var(--color-brand-400)",
              }} />
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--color-neutral-400)" }}>Antall deltakere</p>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <button key={n} onClick={() => setGroupSize(n)}
                  className="w-9 h-9 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: groupSize === n ? "var(--color-brand-500)" : "var(--color-neutral-100)",
                    color: groupSize === n ? "white" : "var(--color-neutral-500)",
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGeneratePacking}
            className="w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--color-brand-500)", color: "white" }}>
            Generer pakkeliste →
          </button>
          <p className="text-center text-xs mt-2" style={{ color: "var(--color-neutral-300)" }}>
            AI lager pakkeliste basert på ruten og antall deltakere
          </p>
        </SectionCard>

        {/* ── Pakkeliste (inline accordion) ─────────────────────────── */}
        {(packingLoading || packingItems.length > 0 || !!packingError) && (
          <SectionCard>
            {/* Accordion toggle */}
            <button
              type="button"
              onClick={() => setPackingExpanded((v) => !v)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>🎒</span>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-neutral-600)" }}>
                    Pakkeliste
                  </p>
                  {!packingLoading && packingItems.length > 0 && (
                    <p className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
                      {packedItemKeys.size} / {packingItems.length} pakket
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown
                className="w-4 h-4 transition-transform shrink-0"
                style={{
                  color: "var(--color-neutral-400)",
                  transform: packingExpanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {packingExpanded && (
              <div className="mt-4">
                {/* Loading */}
                {packingLoading && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <div
                      className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }}
                    />
                    <p className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
                      Genererer pakkeliste…
                    </p>
                  </div>
                )}

                {/* Error */}
                {packingError && (
                  <div className="p-3 rounded-lg mb-2" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
                    <p className="text-sm" style={{ color: "#dc2626" }}>{packingError}</p>
                  </div>
                )}

                {/* Results */}
                {!packingLoading && packingItems.length > 0 && (() => {
                  const grouped = new Map<string, typeof packingItems>();
                  packingItems.forEach((item) => {
                    if (!grouped.has(item.category)) grouped.set(item.category, []);
                    grouped.get(item.category)!.push(item);
                  });

                  let globalIdx = 0;
                  return (
                    <>
                      {/* Progress bar + toolbar */}
                      <div className="mb-4">
                        <div className="w-full h-1.5 rounded-full overflow-hidden"
                          style={{ background: "var(--color-neutral-100)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              background: "#22c55e",
                              width: `${(packedItemKeys.size / packingItems.length) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: "var(--color-brand-100, #dbeafe)", color: "var(--color-brand-500)" }}>
                            AI-generert
                          </span>
                          <button
                            type="button"
                            onClick={() => clearPacking()}
                            className="flex items-center gap-1 text-xs hover:underline"
                            style={{ color: "var(--color-neutral-400)" }}
                          >
                            <RefreshCw size={11} />
                            Generer på nytt
                          </button>
                        </div>
                      </div>

                      {/* Category groups */}
                      {Array.from(grouped.entries()).map(([category, items]) => {
                        const startIdx = globalIdx;
                        globalIdx += items.length;
                        const catPacked = items.filter((_, i) =>
                          packedItemKeys.has(`${category}|${startIdx + i}`)
                        ).length;

                        return (
                          <div key={category} className="mb-2 rounded-xl overflow-hidden"
                            style={{ border: "1px solid var(--color-border-default)" }}>
                            <div className="px-4 py-2.5 flex items-center justify-between"
                              style={{ background: "var(--color-neutral-50, #f9fafb)" }}>
                              <p className="text-sm font-semibold" style={{ color: "var(--color-neutral-600)" }}>
                                {category}
                              </p>
                              {catPacked > 0 && (
                                <span className="text-xs" style={{ color: "var(--color-neutral-300)" }}>
                                  {catPacked}/{items.length}
                                </span>
                              )}
                            </div>

                            {items.map((item, i) => {
                              const key = `${category}|${startIdx + i}`;
                              const packed = packedItemKeys.has(key);
                              return (
                                <label
                                  key={i}
                                  className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                                  style={{
                                    borderTop: "1px solid var(--color-border-default)",
                                    background: packed ? "#f0fdf4" : "white",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={packed}
                                    onChange={() => togglePackedItem(key)}
                                    className="w-4 h-4 mt-0.5 flex-shrink-0 accent-green-600 cursor-pointer"
                                  />
                                  <div style={{ opacity: packed ? 0.5 : 1 }}>
                                    <p
                                      className="text-sm font-medium"
                                      style={{
                                        color: "var(--color-neutral-600)",
                                        textDecoration: packed ? "line-through" : "none",
                                      }}
                                    >
                                      {item.quantity}× {item.item}
                                    </p>
                                    {item.notes && (
                                      <p className="text-xs mt-0.5" style={{ color: "var(--color-neutral-400)" }}>
                                        {item.notes}
                                      </p>
                                    )}
                                    <p className="text-xs mt-0.5" style={{ color: "var(--color-neutral-300)" }}>
                                      {item.assignedTo === "group" ? "Gruppes ansvar" : "Personlig ansvar"}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Turguide PDF — F8 / T1 ──────────────────────────────────── */}
        {stages.length > 0 && (
          <SectionCard>
            <SectionTitle
              emoji="📄"
              title="Turguide"
              sub="Last ned etapper, hytter og nødinfo som PDF"
            />
            <OfflineDownloadButton
              trip={trip}
              cabins={cabins}
              stages={stages}
              participants={participants}
            />
          </SectionCard>
        )}

        {/* ── Etteroppgjør — F9 / R1 ───────────────────────────────────── */}
        <SectionCard>
          <SectionTitle
            emoji="💰"
            title="Etteroppgjør"
            sub="Registrer utgifter og beregn hvem som skylder hva"
          />
          <ExpensePanel tripId={String(trip.id)} participants={participants} />
        </SectionCard>

      </div>

      {showInviteModal && (
        <InviteModal
          tripId={trip.id}
          tripName={trip.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
