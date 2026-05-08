"use client";

import { create } from "zustand";
import type { Place, WeatherDay, PackingItem, TripInput } from "@/types";

interface TripStore {
  // ── Selected location ─────────────────────────────────────────────────────
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;

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
}

export const useTripStore = create<TripStore>((set) => ({
  // ── selected place ────────────────────────────────────────────────────────
  selectedPlace: null,
  setSelectedPlace: (place) =>
    set({ selectedPlace: place, sidebarOpen: !!place }),

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
    set({ packingItems: [], packingLoading: false, packingError: null }),
}));
