"use client";

import dynamic from "next/dynamic";
import SearchBar from "@/components/search/SearchBar";
import PackingListPanel from "@/components/packing/PackingListPanel";
import TripSuggestions from "@/components/trips/TripSuggestions";

// Map must be client-only (no SSR)
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

export default function Home() {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* ── Full-screen map ─────────────────────────────────── */}
      <div className="absolute inset-0">
        <Map />
      </div>

      {/* ── Top bar ────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl">⛰️</span>
          <span
            className="text-lg font-bold tracking-tight hidden sm:block"
            style={{ color: "var(--color-brand-500)" }}
          >
            friluftskompis
          </span>
        </div>

        {/* Search bar fills remaining space */}
        <div className="flex-1 max-w-xl">
          <SearchBar />
        </div>
      </div>

      {/* ── Trip suggestions panel (left side) ─────────── */}
      <div className="absolute left-4 z-10" style={{ top: 72 }}>
        <TripSuggestions />
      </div>

      {/* ── AI Packing list panel (full-screen overlay) ──── */}
      <PackingListPanel />
    </div>
  );
}
