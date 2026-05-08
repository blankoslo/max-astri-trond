"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTripStore } from "@/store/tripStore";

// ESRI World Topographic Map — free, no API key, CORS enabled, great for Norway.
// Tile order is {z}/{y}/{x} (ESRI row/col convention).
// TODO: swap for Kartverket once a domain is registered at developer.kartverket.no
const TOPO_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

// Norway center
const INITIAL_CENTER: [number, number] = [15.5, 65.5];
const INITIAL_ZOOM = 4.8;

export default function MapInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const { mapTarget, setMapTarget } = useTripStore();

  // ── Initialise map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          kartverket: {
            type: "raster",
            tiles: [TOPO_TILES],
            tileSize: 256,
            attribution:
              'Tiles &copy; <a href="https://www.esri.com">Esri</a>',
          },
        },
        layers: [
          {
            id: "kartverket-topo",
            type: "raster",
            source: "kartverket",
            minzoom: 0,
            maxzoom: 18,
          },
        ],
      },
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right"
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Fly-to when mapTarget changes ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapTarget) return;
    map.flyTo({
      center: [mapTarget.lng, mapTarget.lat],
      zoom: mapTarget.zoom ?? 11,
      duration: 1200,
    });
    setMapTarget(null);
  }, [mapTarget, setMapTarget]);

  return <div ref={containerRef} className="w-full h-full" />;
}
