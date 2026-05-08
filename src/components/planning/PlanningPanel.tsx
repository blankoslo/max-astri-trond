"use client";

import { useState, useEffect } from "react";
import { useTripStore } from "@/store/tripStore";
import type { TripGrading } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADING_LABELS: Record<TripGrading, string> = {
  EASY: "Enkel",
  MODERATE: "Moderat",
  TOUGH: "Krevende",
  VERY_TOUGH: "Tøff",
};

const GRADING_COLORS: Record<TripGrading, string> = {
  EASY: "var(--color-success)",
  MODERATE: "var(--color-warning)",
  TOUGH: "var(--color-error)",
  VERY_TOUGH: "var(--color-error)",
};

const GROUP_SIZES = [1, 2, 3, 4, 5, 6, 8, 10, 12];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0"
      style={{
        background: active ? "var(--color-brand-500)" : "var(--color-neutral-100)",
        color:      active ? "white"                   : "var(--color-neutral-500)",
        border:     active
          ? "1.5px solid var(--color-brand-500)"
          : "1.5px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-2"
      style={{ color: "var(--color-neutral-400)" }}>
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanningPanel() {
  const {
    planningTrip,
    planningPanelOpen,
    closePlanningPanel,
    setTripInput,
    openPackingPanel,
    clearPacking,
  } = useTripStore();

  const [startDate, setStartDate] = useState(todayIso());
  const [groupSize, setGroupSize] = useState(2);

  useEffect(() => {
    if (planningTrip) {
      setStartDate(todayIso());
      setGroupSize(2);
    }
  }, [planningTrip?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!planningPanelOpen || !planningTrip) return null;

  const trip     = planningTrip;
  const grading  = trip.grading ?? null;
  const area     = trip.areas[0]?.name ?? trip.counties[0]?.name ?? null;
  const coverImg = trip.media.find((m) => m.type === "image")?.uri ?? null;
  const nights   = trip.durationDays ? trip.durationDays - 1 : 0;

  function handleStartPlanning() {
    clearPacking();
    setTripInput({
      destinationName: trip.name,
      startDate,
      nights,
      groupSize,
      hasKids: false,
      experience: "intermediate",
    });
    closePlanningPanel();
    openPackingPanel();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={closePlanningPanel} />

      <div className="fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden shadow-2xl"
        style={{ width: "min(440px, 100vw)", background: "white" }}>

        {/* Cover / header */}
        <div className="relative shrink-0 flex flex-col justify-end"
          style={{
            height: coverImg ? 200 : 80,
            background: coverImg
              ? `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7)), url(${coverImg}) center/cover no-repeat`
              : "linear-gradient(135deg, var(--color-brand-400), var(--color-brand-600))",
          }}>
          <button onClick={closePlanningPanel}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.35)" }} aria-label="Lukk">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-5 pb-4">
            <h2 className="text-lg font-bold leading-snug text-white">{trip.name}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {grading && (
                <span className="flex items-center gap-1 text-xs text-white/90 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full"
                    style={{ background: GRADING_COLORS[grading] }} />
                  {GRADING_LABELS[grading]}
                </span>
              )}
              {trip.distance && (
                <span className="text-xs text-white/80">
                  {(trip.distance / 1000).toFixed(1)} km
                </span>
              )}
              {area && <span className="text-xs text-white/70">{area}</span>}
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

          {/* Startdato */}
          <div>
            <SectionLabel>Startdato</SectionLabel>
            <input type="date" value={startDate} min={todayIso()}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-neutral-600)",
                // @ts-expect-error css var
                "--tw-ring-color": "var(--color-brand-400)",
              }} />
          </div>

          {/* Antall deltakere */}
          <div>
            <SectionLabel>Antall deltakere</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {GROUP_SIZES.map((n) => (
                <Chip key={n} active={groupSize === n} onClick={() => setGroupSize(n)}>
                  {n}
                </Chip>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl p-4 flex flex-col gap-1"
            style={{
              background: "var(--color-brand-50, #f0f7ff)",
              border: "1px solid var(--color-brand-200, #bfdbfe)",
            }}>
            <p className="text-xs font-semibold" style={{ color: "var(--color-brand-500)" }}>
              Oppsummering
            </p>
            <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
              {trip.name} · {groupSize} {groupSize === 1 ? "person" : "deltakere"}
              {nights > 0 ? ` · ${nights} natt${nights !== 1 ? "er" : ""}` : " · dagstur"}
            </p>
            <p className="text-xs" style={{ color: "var(--color-neutral-400)" }}>
              Fra {startDate}
            </p>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="shrink-0 px-5 py-4"
          style={{ borderTop: "1px solid var(--color-border-default)", background: "white" }}>
          <button onClick={handleStartPlanning}
            className="w-full py-3 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--color-brand-500)", color: "white" }}>
            Start planlegging →
          </button>
          <p className="text-center text-xs mt-2" style={{ color: "var(--color-neutral-400)" }}>
            AI genererer pakkeliste basert på valget ditt
          </p>
        </div>
      </div>
    </>
  );
}
