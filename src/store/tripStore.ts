"use client";

import { create } from "zustand";
import type { Place, WeatherDay, PackingItem, TripInput, UtnoTrip, UtnoCabin } from "@/types";

interface TripStore {
  // ── Selected location ─────────────────────────────────────────────────────
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;

  // ── Selected trip (shown as route on map) ─────────────────────────────────
  selectedTrip: UtnoTrip | null;
  setSelectedTrip: (trip: UtnoTrip | null) => void;

  // ── Cabins along the selected trip route ──────────────────────────────────
  cabinsAlongRoute: UtnoCabin[];
  cabinsLoading: boolean;
  setCabinsAlongRoute: (cabins: UtnoCabin[]) => void;
  setCabinsLoading: (v: boolean) => void;

  // ── "Show all cabins" map toggle ──────────────────────────────────────────
  showAllCabins: boolean;
  setShowAllCabins: (v: boolean) => void;
  allCabins: UtnoCabin[];
  allCabinsLoading: boolean;
  setAllCabins: (cabins: UtnoCabin[]) => void;
  setAllCabinsLoading: (v: boolean) => void;

  // Map fly-to trigger (set lat/lng to make the map pan there)
  mapTarget: { lat: number; lng: number; zoom?: number } | null;
  setMapTarget: (t: { lat: number; lng: number; zoom?: number } | null) => void;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;

  // ── Weather ───────────────────────────────────────────────────────────────
  weather: WeatherDay[] | null;
  weatherLoading: boolean;
  weatherError: string | null;
  setWeather: (days: WeatherDay[] | null) => void;
  setWeatherLoading: (v: boolean) => void;
  setWeatherError: (msg: string | null) => void;

  // ── Planning panel ────────────────────────────────────────────────────────
  planningTrip: UtnoTrip | null;
  planningPanelOpen: boolean;
  openPlanningPanel: (trip: UtnoTrip) => void;
  closePlanningPanel: () => void;

  // ── Packing list panel ────────────────────────────────────────────────────
  packingOpen: boolean;
  openPackingPanel: () => void;
  closePackingPanel: () => void;

  tripInput: TripInput | null;
  setTripInput: (v: TripInput) => void;

  packingItems: PackingItem[];
  packingLoading: boolean;
  packingError: string | null;
  setPackingItems: (items: PackingItem[]) => void;
  setPackingLoading: (v: boolean) => void;
  setPackingError: (msg: string | null) => void;
  clearPacking: () => void;

  // ── Packed-item tracking (keyed by "category|globalIndex") ────────────────
  packedItemKeys: Set<string>;
  togglePackedItem: (key: string) => void;
}

export const useTripStore = create<TripStore>((set) => ({
  // ── selected place ────────────────────────────────────────────────────────
  selectedPlace: null,
  setSelectedPlace: (place) =>
    set({ selectedPlace: place, sidebarOpen: !!place }),

  // ── selected trip ─────────────────────────────────────────────────────────
  selectedTrip: null,
  setSelectedTrip: (trip) => set({ selectedTrip: trip }),

  // ── cabins along route ────────────────────────────────────────────────────
  cabinsAlongRoute: [],
  cabinsLoading: false,
  setCabinsAlongRoute: (cabins) => set({ cabinsAlongRoute: cabins }),
  setCabinsLoading: (v) => set({ cabinsLoading: v }),

  // ── all cabins toggle ─────────────────────────────────────────────────────
  showAllCabins: false,
  setShowAllCabins: (v) => set({ showAllCabins: v, allCabins: v ? [] : [] }),
  allCabins: [],
  allCabinsLoading: false,
  setAllCabins: (cabins) => set({ allCabins: cabins }),
  setAllCabinsLoading: (v) => set({ allCabinsLoading: v }),

  mapTarget: null,
  setMapTarget: (t) => set({ mapTarget: t }),

  // ── sidebar ───────────────────────────────────────────────────────────────
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false, selectedPlace: null }),

  // ── weather ───────────────────────────────────────────────────────────────
  weather: null,
  weatherLoading: false,
  weatherError: null,
  setWeather: (days) => set({ weather: days }),
  setWeatherLoading: (v) => set({ weatherLoading: v }),
  setWeatherError: (msg) => set({ weatherError: msg }),

  // ── planning panel ────────────────────────────────────────────────────────
  planningTrip: null,
  planningPanelOpen: false,
  openPlanningPanel: (trip) => set({ planningTrip: trip, planningPanelOpen: true }),
  closePlanningPanel: () => set({ planningPanelOpen: false, planningTrip: null }),

  // ── packing ───────────────────────────────────────────────────────────────
  packingOpen: false,
  openPackingPanel: () => set({ packingOpen: true }),
  closePackingPanel: () => set({ packingOpen: false }),

  tripInput: null,
  setTripInput: (v) => set({ tripInput: v }),

  packingItems: [],
  packingLoading: false,
  packingError: null,
  setPackingItems: (items) => set({ packingItems: items }),
  setPackingLoading: (v) => set({ packingLoading: v }),
  setPackingError: (msg) => set({ packingError: msg }),
  clearPacking: () =>
    set({ packingItems: [], packingLoading: false, packingError: null, packedItemKeys: new Set() }),

  packedItemKeys: new Set<string>(),
  togglePackedItem: (key) =>
    set((state) => {
      const next = new Set(state.packedItemKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { packedItemKeys: next };
    }),
}));

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).__tripStore = useTripStore;
}
