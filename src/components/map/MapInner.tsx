"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTripStore } from "@/store/tripStore";
import type { UtnoTrip, UtnoCabin, CabinServiceLevel } from "@/types";

const TOPO_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

const INITIAL_CENTER: [number, number] = [15.5, 65.5];
const INITIAL_ZOOM = 4.8;

// ── Layer / source IDs ────────────────────────────────────────────────────────
const ROUTE_SOURCE       = "trip-route";
const ROUTE_LAYER_BG     = "trip-route-bg";
const ROUTE_LAYER        = "trip-route-dots";
const START_SOURCE       = "trip-start";
const START_LAYER        = "trip-start-dot";
const CABIN_SOURCE       = "trip-cabins";          // route cabins
const CABIN_LAYER        = "trip-cabin-circles";
const CABIN_LAYER_LABEL  = "trip-cabin-labels";
const ALL_CAB_SOURCE     = "all-cabins";           // all-cabins toggle
const ALL_CAB_LAYER      = "all-cabins-circles";
const ALL_CAB_LABEL      = "all-cabins-labels";

// ── Service-level colours ─────────────────────────────────────────────────────
const SERVICE_COLOURS: Record<CabinServiceLevel, string> = {
  STAFFED:           "#0f8402",
  SELF_SERVICE:      "#2563eb",
  NO_SERVICE:        "#e15b02",
  EMERGENCY_SHELTER: "#bf0000",
  RENTAL:            "#7c3aed",
};
const DEFAULT_CABIN_COLOUR = "#64748b";

const cabinColourExpr: maplibregl.DataDrivenPropertyValueSpecification<string> = [
  "match", ["get", "serviceLevel"],
  "STAFFED",           SERVICE_COLOURS.STAFFED,
  "SELF_SERVICE",      SERVICE_COLOURS.SELF_SERVICE,
  "NO_SERVICE",        SERVICE_COLOURS.NO_SERVICE,
  "EMERGENCY_SHELTER", SERVICE_COLOURS.EMERGENCY_SHELTER,
  "RENTAL",            SERVICE_COLOURS.RENTAL,
  DEFAULT_CABIN_COLOUR,
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function serviceLevelLabel(level: CabinServiceLevel | null): string {
  switch (level) {
    case "STAFFED":           return "Betjent";
    case "SELF_SERVICE":      return "Selvbetjent";
    case "NO_SERVICE":        return "Uten betjening";
    case "EMERGENCY_SHELTER": return "Nødhytte";
    case "RENTAL":            return "Utleie";
    default:                  return "Hytte";
  }
}

function buildCabinPopupHtml(cabin: UtnoCabin): string {
  const color = SERVICE_COLOURS[cabin.serviceLevel ?? "NO_SERVICE"] ?? DEFAULT_CABIN_COLOUR;
  const label = serviceLevelLabel(cabin.serviceLevel);
  const totalBeds = (cabin.bedsStaffed ?? 0) + (cabin.bedsSelfService ?? 0) + (cabin.bedsNoService ?? 0);
  return `
    <div style="font-family:sans-serif;min-width:160px;max-width:220px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
        <strong style="font-size:13px;line-height:1.3">${cabin.name}</strong>
      </div>
      <p style="margin:0;font-size:12px;color:${color};font-weight:600">${label}</p>
      ${totalBeds > 0 ? `<p style="margin:2px 0 0;font-size:12px;color:#555">${totalBeds} sengeplasser</p>` : ""}
      ${cabin.distanceFromRoute != null ? `<p style="margin:2px 0 0;font-size:11px;color:#888">${cabin.distanceFromRoute} m fra ruten</p>` : ""}
      ${cabin.bookingUrl ? `<a href="${cabin.bookingUrl}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;font-size:12px;color:#2563eb;text-decoration:underline">Book nå →</a>` : ""}
    </div>`.trim();
}

function cabinsToGeoJSON(cabins: UtnoCabin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cabins
      .filter((c) => c.geojson?.coordinates)
      .map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: c.geojson!.coordinates as [number, number] },
        properties: {
          id: c.id,
          name: c.name,
          serviceLevel: c.serviceLevel ?? "NO_SERVICE",
          popupHtml: buildCabinPopupHtml(c),
        },
      })),
  };
}

function addCabinHoverPopup(map: maplibregl.Map, layerId: string, popup: maplibregl.Popup) {
  map.on("mouseenter", layerId, (e) => {
    map.getCanvas().style.cursor = "pointer";
    const feature = e.features?.[0];
    if (!feature) return;
    const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
    const html = feature.properties?.popupHtml as string | undefined;
    if (html) popup.setLngLat(coords).setHTML(html).addTo(map);
  });
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });
}

// ── Trip route draw ───────────────────────────────────────────────────────────
function drawTrip(map: maplibregl.Map, trip: UtnoTrip | null) {
  const routeSrc = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined;
  const startSrc = map.getSource(START_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!routeSrc || !startSrc) return;

  if (!trip?.geojson?.coordinates?.length) {
    routeSrc.setData({ type: "FeatureCollection", features: [] });
    startSrc.setData({ type: "FeatureCollection", features: [] });
    return;
  }
  const coords = trip.geojson.coordinates;
  routeSrc.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
  const [lon, lat] = coords[0];
  startSrc.setData({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: {} });

  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  map.fitBounds(
    [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
    { padding: { top: 80, bottom: 60, left: 360, right: 80 }, duration: 1200, maxZoom: 15 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MapInner() {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<maplibregl.Map | null>(null);
  const mapReadyRef    = useRef(false);
  const pendingTripRef = useRef<UtnoTrip | null>(null);
  const popupRef       = useRef<maplibregl.Popup | null>(null);

  const {
    mapTarget, setMapTarget,
    selectedTrip, cabinsAlongRoute,
    showAllCabins, setShowAllCabins,
    allCabins, setAllCabins, setAllCabinsLoading, allCabinsLoading,
  } = useTripStore();

  // ── Fetch all cabins near a point ─────────────────────────────────────────
  const fetchAllCabins = useCallback(async (lat: number, lng: number) => {
    setAllCabinsLoading(true);
    try {
      const res = await fetch(`/api/cabins?lat=${lat}&lng=${lng}&radius=25000`);
      if (res.ok) {
        const data = await res.json();
        setAllCabins(data.cabins ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setAllCabinsLoading(false);
    }
  }, [setAllCabins, setAllCabinsLoading]);

  // ── Initialise map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { 
          topo: { 
            type: "raster", 
            tiles: [TOPO_TILES], 
            tileSize: 256,
            attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>' 
          } 
        },
        layers: [{ id: "topo", type: "raster", source: "topo", minzoom: 0, maxzoom: 18 }],
      },
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      "top-right"
    );

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "240px" });
    popupRef.current = popup;

    map.on("load", () => {
      // ── All-cabins layer (below route cabins) ─────────────────────────────
      map.addSource(ALL_CAB_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: ALL_CAB_LAYER + "-outline", type: "circle", source: ALL_CAB_SOURCE,
        paint: { "circle-radius": 8, "circle-color": "#ffffff", "circle-opacity": 0.85 } });
      map.addLayer({ id: ALL_CAB_LAYER, type: "circle", source: ALL_CAB_SOURCE,
        paint: { "circle-radius": 6, "circle-color": cabinColourExpr, "circle-opacity": 0.7 } });
      map.addLayer({ id: ALL_CAB_LABEL, type: "symbol", source: ALL_CAB_SOURCE,
        layout: { "text-field": "🛏", "text-size": 9, "text-allow-overlap": true, "text-ignore-placement": true } });
      addCabinHoverPopup(map, ALL_CAB_LAYER, popup);

      // ── Route-cabin layer (on top, full opacity) ──────────────────────────
      map.addSource(CABIN_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: CABIN_LAYER + "-outline", type: "circle", source: CABIN_SOURCE,
        paint: { "circle-radius": 9, "circle-color": "#ffffff" } });
      map.addLayer({ id: CABIN_LAYER, type: "circle", source: CABIN_SOURCE,
        paint: { "circle-radius": 7, "circle-color": cabinColourExpr } });
      map.addLayer({ id: CABIN_LAYER_LABEL, type: "symbol", source: CABIN_SOURCE,
        layout: { "text-field": "🛏", "text-size": 10, "text-allow-overlap": true, "text-ignore-placement": true } });
      addCabinHoverPopup(map, CABIN_LAYER, popup);

      // ── Route ─────────────────────────────────────────────────────────────
      map.addSource(ROUTE_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: ROUTE_LAYER_BG, type: "line", source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.6 } });
      map.addLayer({ id: ROUTE_LAYER, type: "line", source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#4f59fb", "line-width": 4, "line-dasharray": [0, 2.5] } });

      // ── Start marker ──────────────────────────────────────────────────────
      map.addSource(START_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: START_LAYER, type: "circle", source: START_SOURCE,
        paint: { "circle-radius": 7, "circle-color": "#4f59fb",
                 "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" } });

      mapReadyRef.current = true;
      containerRef.current?.setAttribute("data-map-ready", "true");

      if (pendingTripRef.current) {
        drawTrip(map, pendingTripRef.current);
        pendingTripRef.current = null;
      }
    });

    // Re-fetch all cabins when map stops moving (if toggle is on)
    let moveEndTimer: ReturnType<typeof setTimeout> | null = null;
    map.on("moveend", () => {
      if (!useTripStore.getState().showAllCabins) return;
      if (moveEndTimer) clearTimeout(moveEndTimer);
      moveEndTimer = setTimeout(() => {
        const c = map.getCenter();
        fetchAllCabins(c.lat, c.lng);
      }, 400);
    });

    mapRef.current = map;
    return () => {
      mapReadyRef.current = false;
      if (moveEndTimer) clearTimeout(moveEndTimer);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Draw route ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!mapReadyRef.current) { pendingTripRef.current = selectedTrip; return; }
    drawTrip(map, selectedTrip);
  }, [selectedTrip]);

  // ── Draw route cabins ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const src = map.getSource(CABIN_SOURCE) as maplibregl.GeoJSONSource | undefined;
    src?.setData(cabinsToGeoJSON(cabinsAlongRoute));
  }, [cabinsAlongRoute]);

  // ── All-cabins toggle ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const src = map.getSource(ALL_CAB_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!showAllCabins) {
      // Clear
      src?.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    // Fetch for current map centre
    const c = map.getCenter();
    fetchAllCabins(c.lat, c.lng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllCabins]);

  // ── Draw all cabins ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const src = map.getSource(ALL_CAB_SOURCE) as maplibregl.GeoJSONSource | undefined;
    src?.setData(cabinsToGeoJSON(allCabins));
  }, [allCabins]);

  // ── Fly-to ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapTarget) return;
    map.flyTo({ center: [mapTarget.lng, mapTarget.lat], zoom: mapTarget.zoom ?? 11, duration: 1200 });
    setMapTarget(null);
  }, [mapTarget, setMapTarget]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Floating cabin toggle ──────────────────────────────────────────── */}
      <button
        onClick={() => setShowAllCabins(!showAllCabins)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all z-10"
        style={{
          background: showAllCabins ? "#4f59fb" : "white",
          color:      showAllCabins ? "white"   : "#4d4d4d",
          border:     showAllCabins ? "none"     : "1px solid #d9d9d9",
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}
        title={showAllCabins ? "Skjul hytter" : "Vis alle hytter i området"}
      >
        {allCabinsLoading ? (
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0"
            style={{ borderColor: showAllCabins ? "white" : "#4f59fb", borderTopColor: "transparent" }}
          />
        ) : (
          <span>🛖</span>
        )}
        {allCabinsLoading
          ? "Henter hytter…"
          : showAllCabins
            ? `Skjul hytter${allCabins.length > 0 ? ` (${allCabins.length})` : ""}`
            : "Vis hytter i området"}
      </button>
    </div>
  );
}
