"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Settings } from "lucide-react";
import TripSuggestions from "@/components/trips/TripSuggestions";

// Map must be client-only (Leaflet / MapLibre touch the DOM)
const Map = dynamic(() => import("@/components/map/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Laster kart…</span>
      </div>
    </div>
  ),
});

type Tab = "turer" | "kart";

export default function Home() {
  const [tab, setTab] = useState<Tab>("turer");

  return (
    <div className="h-screen flex flex-col" style={{ background: "#f8f9fb" }}>
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center gap-3 px-6 py-3"
        style={{
          background: "white",
          borderBottom: "1px solid var(--color-border-default)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        }}
      >
        <span className="text-2xl">⛰️</span>
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--color-brand-500)" }}
        >
          friluftskompis
        </span>
        <span
          className="text-sm ml-1 hidden sm:block"
          style={{ color: "var(--color-neutral-300)" }}
        >
          — planlegg neste tur
        </span>

        {/* ── Tab switcher ───────────────────────────────────── */}
        <div
          className="ml-auto flex items-center gap-2"
        >
          <div
            className="flex items-center p-1 rounded-xl gap-1"
            style={{ background: "var(--color-neutral-100)" }}
          >
            {(["turer", "kart"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === t ? "white" : "transparent",
                  color:
                    tab === t
                      ? "var(--color-brand-500)"
                      : "var(--color-neutral-400)",
                  boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                }}
              >
                {t === "turer" ? "🥾" : "🗺️"}
                <span className="capitalize">{t === "turer" ? "Turer" : "Kart"}</span>
              </button>
            ))}
          </div>

          {/* ── Settings link ────────────────────────────────── */}
          <Link
            href="/admin"
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-all hover:bg-opacity-80"
            style={{
              background: "var(--color-neutral-100)",
              color: "var(--color-neutral-400)",
            }}
            title="Systemkonfigurasjon"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        {/* Trip list — unmount when on map tab so search state resets cleanly */}
        <div
          className="absolute inset-0"
          style={{ display: tab === "turer" ? "block" : "none" }}
        >
          <TripSuggestions />
        </div>

        {/* Map — keep mounted once visited so MapLibre doesn't reinitialise */}
        <div
          className="absolute inset-0"
          style={{ display: tab === "kart" ? "block" : "none" }}
        >
          <Map />
        </div>
      </main>
    </div>
  );
}
