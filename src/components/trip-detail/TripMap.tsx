"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { UtnoTrip, UtnoCabin, CabinServiceLevel } from "@/types";

const TOPO_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

interface TripMapProps {
  trip: UtnoTrip;
  cabins: UtnoCabin[];
}

const ROUTE_SOURCE      = "trip-route";
const ROUTE_LAYER_BG    = "trip-route-bg";
const ROUTE_LAYER       = "trip-route-line";
const START_SOURCE      = "trip-start";
const START_LAYER       = "trip-start-dot";
const END_SOURCE        = "trip-end";
const END_LAYER         = "trip-end-dot";
const CABIN_SOURCE      = "trip-cabins";
const CABIN_LAYER       = "trip-cabin-circles";
const CABIN_LAYER_LABEL = "trip-cabin-labels";

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
      ${cabin.distanceFromRoute != null ? `<p style="margin:2px 0 0;font-size:11px;color:#888">${Math.round(cabin.distanceFromRoute)} m fra ruten</p>` : ""}
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
          id: c.id, name: c.name,
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

// Fit map to route bounds
function fitToRoute(map: maplibregl.Map, coords: number[][]) {
  if (!coords.length) return;
  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  map.fitBounds(
    [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
    { padding: { top: 50, bottom: 50, left: 50, right: 50 }, duration: 800, maxZoom: 15 }
  );
}

// Apply trip data to already-loaded map
function applyTrip(map: maplibregl.Map, trip: UtnoTrip) {
  const routeSrc = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined;
  const startSrc = map.getSource(START_SOURCE) as maplibregl.GeoJSONSource | undefined;
  const endSrc   = map.getSource(END_SOURCE)   as maplibregl.GeoJSONSource | undefined;
  if (!routeSrc || !startSrc || !endSrc) return;

  const coords = trip.geojson?.coordinates;
  if (!coords?.length) {
    routeSrc.setData({ type: "FeatureCollection", features: [] });
    startSrc.setData({ type: "FeatureCollection", features: [] });
    endSrc.setData(  { type: "FeatureCollection", features: [] });
    return;
  }

  routeSrc.setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {},
  });

  const [slon, slat] = coords[0];
  startSrc.setData({ type: "Feature", geometry: { type: "Point", coordinates: [slon, slat] }, properties: {} });

  const [elon, elat] = coords[coords.length - 1];
  endSrc.setData({ type: "Feature", geometry: { type: "Point", coordinates: [elon, elat] }, properties: {} });

  fitToRoute(map, coords);
}

function applyCabins(map: maplibregl.Map, cabins: UtnoCabin[]) {
  const src = map.getSource(CABIN_SOURCE) as maplibregl.GeoJSONSource | undefined;
  src?.setData(cabinsToGeoJSON(cabins));
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TripMap({ trip, cabins }: TripMapProps) {
  const containerRef     = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<maplibregl.Map | null>(null);
  const mapReadyRef      = useRef(false);
  // Queue data that arrives before map "load" fires
  const pendingTripRef   = useRef<UtnoTrip | null>(null);
  const pendingCabinsRef = useRef<UtnoCabin[]>([]);
  const popupRef         = useRef<maplibregl.Popup | null>(null);

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { topo: { type: "raster", tiles: [TOPO_TILES], tileSize: 256,
          attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>' } },
        layers: [{ id: "topo", type: "raster", source: "topo", minzoom: 0, maxzoom: 18 }],
      },
      center: [15, 65],
      zoom: 5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "240px" });
    popupRef.current = popup;

    map.on("load", () => {
      // Cabin layer
      map.addSource(CABIN_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: CABIN_LAYER + "-outline", type: "circle", source: CABIN_SOURCE,
        paint: { "circle-radius": 9, "circle-color": "#ffffff" } });
      map.addLayer({ id: CABIN_LAYER, type: "circle", source: CABIN_SOURCE,
        paint: { "circle-radius": 7, "circle-color": cabinColourExpr } });
      map.addLayer({ id: CABIN_LAYER_LABEL, type: "symbol", source: CABIN_SOURCE,
        layout: { "text-field": "🛏", "text-size": 10, "text-allow-overlap": true, "text-ignore-placement": true } });
      addCabinHoverPopup(map, CABIN_LAYER, popup);

      // Route layers
      map.addSource(ROUTE_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: ROUTE_LAYER_BG, type: "line", source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.7 } });
      map.addLayer({ id: ROUTE_LAYER, type: "line", source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#4f59fb", "line-width": 3, "line-dasharray": [0, 2.5] } });

      // Start marker (green)
      map.addSource(START_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: START_LAYER, type: "circle", source: START_SOURCE,
        paint: { "circle-radius": 8, "circle-color": "#0f8402",
                 "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" } });

      // End marker (red)
      map.addSource(END_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: END_LAYER, type: "circle", source: END_SOURCE,
        paint: { "circle-radius": 8, "circle-color": "#bf0000",
                 "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" } });

      mapReadyRef.current = true;

      // Flush queued data
      if (pendingTripRef.current) {
        applyTrip(map, pendingTripRef.current);
        pendingTripRef.current = null;
      }
      if (pendingCabinsRef.current.length > 0) {
        applyCabins(map, pendingCabinsRef.current);
        pendingCabinsRef.current = [];
      }
    });

    mapRef.current = map;
    return () => {
      mapReadyRef.current = false;
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Apply trip when it changes ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!trip) return;
    if (!map || !mapReadyRef.current) {
      pendingTripRef.current = trip; // map not ready yet — queue it
      return;
    }
    applyTrip(map, trip);
  }, [trip]);

  // ── Apply cabins when they change ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      pendingCabinsRef.current = cabins;
      return;
    }
    applyCabins(map, cabins);
  }, [cabins]);

  return <div ref={containerRef} className="w-full h-full" />;
}
