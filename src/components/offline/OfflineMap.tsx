"use client";

/**
 * OfflineMap — MapLibre instance used in the offline navigation page.
 *
 * Key differences from TripMap:
 *  - Tiles served via /api/tiles proxy (intercepted & cached by Service Worker)
 *  - GeolocateControl in trackUserLocation mode (continuous GPS)
 *  - User-position dot styled for dark background
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { UtnoTrip, UtnoCabin, CabinServiceLevel } from "@/types";

// Tile URL served via our proxy — SW caches these
const OFFLINE_TILE_URL = "/api/tiles?z={z}&x={x}&y={y}";

interface OfflineMapProps {
  trip: UtnoTrip;
  cabins: UtnoCabin[];
}

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
      ${cabin.phone ? `<p style="margin:4px 0 0;font-size:12px;color:#333">📞 ${cabin.phone}</p>` : ""}
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

export default function OfflineMap({ trip, cabins }: OfflineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Derive initial center from route start
    const coords = trip.geojson?.coordinates ?? [];
    const center: [number, number] = coords.length > 0
      ? [coords[0][0], coords[0][1]]
      : [15, 65];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          topo: {
            type: "raster",
            tiles: [OFFLINE_TILE_URL],
            tileSize: 256,
            attribution: "© Kartverket / OpenStreetMap",
          },
        },
        layers: [
          { id: "topo-bg", type: "raster", source: "topo", minzoom: 0, maxzoom: 18 },
        ],
      },
      center,
      zoom: 13,
    });

    // Navigation controls (zoom buttons)
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // GPS tracking — continuous so user can see position update as they move
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.addControl(geolocate, "top-right");

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "240px",
    });

    map.on("load", () => {
      // ── Route ────────────────────────────────────────────────────────────
      map.addSource("route", {
        type: "geojson",
        data: coords.length > 1
          ? { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }
          : { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-bg", type: "line", source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.55 },
      });
      map.addLayer({
        id: "route-line", type: "line", source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#4f59fb", "line-width": 4, "line-dasharray": [0, 2.5] },
      });

      // ── Start marker (green) ──────────────────────────────────────────────
      if (coords.length > 0) {
        map.addSource("start", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "Point", coordinates: coords[0] }, properties: {} },
        });
        map.addLayer({
          id: "start-dot", type: "circle", source: "start",
          paint: {
            "circle-radius": 9,
            "circle-color": "#0f8402",
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      // ── End marker (red) ─────────────────────────────────────────────────
      if (coords.length > 1) {
        const last = coords[coords.length - 1];
        map.addSource("end", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "Point", coordinates: last }, properties: {} },
        });
        map.addLayer({
          id: "end-dot", type: "circle", source: "end",
          paint: {
            "circle-radius": 9,
            "circle-color": "#bf0000",
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      // ── Cabin markers ─────────────────────────────────────────────────────
      map.addSource("cabins", { type: "geojson", data: cabinsToGeoJSON(cabins) });
      map.addLayer({
        id: "cabins-outline", type: "circle", source: "cabins",
        paint: { "circle-radius": 9, "circle-color": "#ffffff" },
      });
      map.addLayer({
        id: "cabins-fill", type: "circle", source: "cabins",
        paint: { "circle-radius": 7, "circle-color": cabinColourExpr },
      });
      map.addLayer({
        id: "cabins-label", type: "symbol", source: "cabins",
        layout: { "text-field": "🛏", "text-size": 10, "text-allow-overlap": true, "text-ignore-placement": true },
      });

      // Cabin hover popup
      map.on("mouseenter", "cabins-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        if (!feature) return;
        const coords2d = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const html = feature.properties?.popupHtml as string | undefined;
        if (html) popup.setLngLat(coords2d).setHTML(html).addTo(map);
      });
      map.on("mouseleave", "cabins-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // Fit to route
      if (coords.length > 1) {
        const lons = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        map.fitBounds(
          [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
          { padding: { top: 60, bottom: 120, left: 40, right: 60 }, duration: 800, maxZoom: 14 }
        );
      }

      // Auto-trigger GPS on load so user sees their position immediately
      geolocate.trigger();
    });

    mapRef.current = map;

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
