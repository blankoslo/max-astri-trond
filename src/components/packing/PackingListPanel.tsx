"use client";

import { useState, useRef } from "react";
import { useTripStore } from "@/store/tripStore";
import { PackingListSchema } from "@/lib/ai/prompts";
import type { PackingItem } from "@/types";
import { X, RefreshCw, ChevronDown } from "lucide-react";

export default function PackingListPanel() {
  const {
    packingOpen,
    closePackingPanel,
    selectedPlace,
    setTripInput,
    packingItems,
    packingLoading,
    packingError,
    setPackingItems,
    setPackingLoading,
    setPackingError,
    clearPacking,
  } = useTripStore();

  // Local form state for Step 1
  const [localStartDate, setLocalStartDate] = useState<string>(
    new Date(new Date().getTime() + 86400000).toISOString().split("T")[0]
  );
  const [localNights, setLocalNights] = useState<number>(2);
  const [localGroupSize, setLocalGroupSize] = useState<number>(2);
  const [localHasKids, setLocalHasKids] = useState<boolean>(false);
  const [localExperience, setLocalExperience] = useState<
    "beginner" | "intermediate" | "experienced"
  >("beginner");

  // For tracking expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  if (!packingOpen || !selectedPlace) {
    return null;
  }

  // ─── Step 1: Trip form ───────────────────────────────────────────────────────

  const showForm = packingItems.length === 0 && !packingLoading;

  const handleGeneratePacking = async () => {
    if (!selectedPlace) return;

    // Create trip input
    const fullTripInput = {
      destinationName: selectedPlace.name,
      startDate: localStartDate,
      nights: localNights,
      groupSize: localGroupSize,
      hasKids: localHasKids,
      experience: localExperience,
    };

    setTripInput(fullTripInput);
    clearPacking();
    setPackingLoading(true);
    setPackingError(null);

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullTripInput),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `API error: ${response.status}`);
      }

      // API now returns plain JSON — no streaming needed
      const parsed = await response.json();
      const validated = PackingListSchema.parse(parsed);

      setPackingItems(validated);
      setPackingLoading(false);
      setExpandedCategories(new Set(validated.map((item) => item.category)));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }

      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setPackingError(message);
      setPackingLoading(false);
      console.error("Packing generation error:", err);
    }
  };

  // ─── Step 2: Results ─────────────────────────────────────────────────────────

  const groupedItems: Map<string, PackingItem[]> = new Map();
  packingItems.forEach((item) => {
    if (!groupedItems.has(item.category)) {
      groupedItems.set(item.category, []);
    }
    groupedItems.get(item.category)!.push(item);
  });

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const handleStartOver = () => {
    clearPacking();
    setLocalStartDate(
      new Date(new Date().getTime() + 86400000).toISOString().split("T")[0]
    );
    setLocalNights(2);
    setLocalGroupSize(2);
    setLocalHasKids(false);
    setLocalExperience("beginner");
  };

  const handleClose = () => {
    clearPacking();
    closePackingPanel();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <>
      {/* Overlay backdrop */}
      {packingOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl bg-white shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {showForm ? "Plan turen" : "Pakkeliste"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Lukk"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {showForm ? (
            // ─ Step 1: Form ─────────────────────────────────────────────────
            <div className="p-6 space-y-6">
              {/* Destination name */}
              <div>
                <p className="text-sm text-slate-600 mb-1">Destinasjon</p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedPlace.name}
                </p>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Startdato
                </label>
                <input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Nights */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Antall netter: {localNights}
                </label>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={localNights}
                  onChange={(e) => setLocalNights(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Group size */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Gruppestørrelse: {localGroupSize}
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={localGroupSize}
                  onChange={(e) => setLocalGroupSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Kids toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localHasKids}
                    onChange={(e) => setLocalHasKids(e.target.checked)}
                    className="w-4 h-4 border border-slate-300 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Barn med?
                  </span>
                </label>
              </div>

              {/* Experience level */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Erfaringsnivå
                </label>
                <select
                  value={localExperience}
                  onChange={(e) =>
                    setLocalExperience(
                      e.target.value as
                        | "beginner"
                        | "intermediate"
                        | "experienced"
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Nybegynner</option>
                  <option value="intermediate">Erfaren</option>
                  <option value="experienced">Klatreekspert</option>
                </select>
              </div>

              {/* Error message */}
              {packingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{packingError}</p>
                </div>
              )}
            </div>
          ) : (
            // ─ Step 2: Results ──────────────────────────────────────────────
            <div className="p-6 space-y-4">
              {/* AI Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  AI-generert
                </span>
              </div>

              {/* Categories and items */}
              {Array.from(groupedItems.entries()).map(([category, items]) => (
                <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <h3 className="font-semibold text-slate-900">{category}</h3>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-600 transition-transform ${
                        expandedCategories.has(category) ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Items */}
                  {expandedCategories.has(category) && (
                    <div className="border-t border-slate-200 bg-slate-50">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-3 border-b border-slate-200 last:border-b-0 flex items-start gap-3"
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            className="w-4 h-4 mt-1 border border-slate-300 rounded cursor-pointer"
                          />

                          {/* Item details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {item.quantity}× {item.item}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.notes}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {item.assignedTo === "group"
                                ? "Gruppes ansvar"
                                : "Personlig ansvar"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Loading state */}
          {packingLoading && (
            <div className="p-6 flex flex-col items-center justify-center min-h-64">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-600 text-center">
                Genererer pakkeliste…
              </p>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="border-t border-slate-200 px-6 py-4 space-y-3">
          {showForm ? (
            <button
              onClick={handleGeneratePacking}
              disabled={packingLoading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              Generer pakkeliste
            </button>
          ) : (
            <>
              <button
                onClick={handleStartOver}
                className="w-full px-4 py-3 flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Start på nytt
              </button>
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Lukk
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
