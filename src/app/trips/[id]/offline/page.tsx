"use client";

/**
 * F8 — Offline navigasjon (T1)
 *
 * Full-screen kart som:
 *  - Laster rute + hyttedata fra IndexedDB (ingen nettverkstilgang nødvendig)
 *  - Bruker Service Worker-cachede karttiles via /api/tiles
 *  - Viser GPS-posisjon (GeolocateControl fra MapLibre)
 *  - Viser etappepanel som kan trekkes inn/ut
 *  - Viser offline-badge og nettverksstatus
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { loadOfflineTrip } from "@/lib/offlineStorage";
import type { OfflineTrip, OfflineStage } from "@/lib/offlineStorage";

// Load the map dynamically (no SSR — MapLibre needs browser APIs)
const OfflineMap = dynamic(() => import("@/components/offline/OfflineMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: "#2a3a2a" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#4f9", borderTopColor: "transparent" }} />
        <span className="text-sm text-white/60">Laster kart…</span>
      </div>
    </div>
  ),
});

// ── Network status hook ───────────────────────────────────────────────────────

function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

// ── Stage panel ───────────────────────────────────────────────────────────────

function StagePanel({ stages, tripName }: { stages: OfflineStage[]; tripName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300"
      style={{
        transform: open ? "translateY(0)" : `translateY(calc(100% - 56px))`,
        background: "white",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
        maxHeight: "55vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Handle / toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 shrink-0"
        style={{ height: 56 }}
        aria-label={open ? "Skjul etapper" : "Vis etapper"}
      >
        <div className="flex items-center gap-2">
          <span>🗺️</span>
          <span className="text-sm font-semibold" style={{ color: "var(--color-neutral-600)" }}>
            {tripName} — {stages.length} etappe{stages.length !== 1 ? "r" : ""}
          </span>
        </div>
        <ChevronIcon up={open} />
      </button>

      {/* Stage list */}
      {open && (
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {stages.map((stage, idx) => (
            <div key={stage.day} className="flex gap-3 py-2"
              style={{ borderTop: idx > 0 ? "1px solid var(--color-border-default)" : "none" }}>
              {/* Day dot */}
              <div className="flex flex-col items-center" style={{ width: 24, flexShrink: 0 }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: idx === 0 ? "#0f8402" : "var(--color-brand-500, #4f59fb)",
                    color: "white",
                    flexShrink: 0,
                  }}>
                  {idx === 0 ? "S" : idx}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className="text-xs font-medium mb-0.5"
                  style={{ color: "var(--color-neutral-300)" }}>Dag {stage.day}</p>
                <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
                  {stage.startName}
                  <span style={{ color: "var(--color-neutral-300)" }}> → </span>
                  {stage.endName}
                </p>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
                    📏 {stage.distanceKm} km
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
                    ⏱ {stage.estimatedHours} t
                  </span>
                  {stage.isOvernight && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "#eff6ff", color: "#4f59fb" }}>
                      🛏 overnatting
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface RouteParams { id: string }

export default function OfflinePage({ params }: { params: Promise<RouteParams> }) {
  const router = useRouter();
  const online = useOnlineStatus();

  const [routeParams, setRouteParams] = useState<RouteParams | null>(null);
  const [offlineData, setOfflineData] = useState<OfflineTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve async route params (Next.js 16 App Router)
  useEffect(() => { params.then(setRouteParams); }, [params]);

  // Load from IndexedDB
  useEffect(() => {
    if (!routeParams?.id) return;
    setLoading(true);
    loadOfflineTrip(routeParams.id)
      .then((data) => {
        if (!data) {
          setError("Denne turen er ikke lastet ned for offline bruk.");
        } else {
          setOfflineData(data);
        }
      })
      .catch(() => setError("Kunne ikke laste offline-data."))
      .finally(() => setLoading(false));
  }, [routeParams?.id]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "#1a2a1a" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#4CAF50", borderTopColor: "transparent" }} />
          <p className="text-sm text-white/60">Laster offline-data…</p>
        </div>
      </div>
    );
  }

  // ── Not downloaded ───────────────────────────────────────────────────────
  if (error || !offlineData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: "#1a2a1a" }}>
        <span className="text-5xl">📵</span>
        <p className="text-white font-semibold">{error ?? "Ingen offline-data"}</p>
        <p className="text-sm text-white/50">
          Gå tilbake og trykk «Last ned for offline bruk» mens du har nettilgang.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "#4f59fb", color: "white" }}
        >
          ← Tilbake
        </button>
      </div>
    );
  }

  const { trip, cabins, stages } = offlineData;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#2a3a2a" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 z-30 shrink-0"
        style={{
          height: 52,
          background: "rgba(20,30,20,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
          aria-label="Tilbake"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{trip.name}</h1>
        </div>

        {/* Network badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
          style={{
            background: online ? "rgba(15,132,2,0.25)" : "rgba(191,0,0,0.25)",
            color: online ? "#6ee26e" : "#ff7070",
            border: `1px solid ${online ? "rgba(15,132,2,0.4)" : "rgba(191,0,0,0.4)"}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: online ? "#6ee26e" : "#ff7070" }}
          />
          {online ? "Online" : "Offline"}
        </div>
      </header>

      {/* ── Map (fills remaining space) ──────────────────────────────────── */}
      <div className="flex-1 relative">
        <OfflineMap trip={trip} cabins={cabins} />

        {/* Stage panel sits inside map area, above map */}
        <StagePanel stages={stages} tripName={trip.name} />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      className="w-4 h-4 transition-transform duration-200"
      style={{ color: "var(--color-neutral-400)", transform: up ? "rotate(0deg)" : "rotate(180deg)" }}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}
