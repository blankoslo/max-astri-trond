"use client";

/**
 * OfflineDownloadButton (F8 — T1)
 *
 * Allows a user to download a trip for offline use:
 *  1. Saves trip + cabin + stage data to IndexedDB
 *  2. Tells the Service Worker to pre-cache all map tiles for the bounding box
 *
 * Shows progress during download, and a "Naviger offline →" link when done.
 */

import { useState, useEffect, useCallback } from "react";
import { saveOfflineTrip, loadOfflineTrip, buildTileUrls, deleteOfflineTrip } from "@/lib/offlineStorage";
import type { OfflineStage } from "@/lib/offlineStorage";
import type { UtnoTrip, UtnoCabin } from "@/types";

type DownloadState = "idle" | "saving" | "tiles" | "done" | "error";

interface Props {
  tripId: string;
  trip: UtnoTrip;
  cabins: UtnoCabin[];
  stages: OfflineStage[];
}

export default function OfflineDownloadButton({ tripId, trip, cabins, stages }: Props) {
  const [state,    setState]    = useState<DownloadState>("idle");
  const [progress, setProgress] = useState(0); // 0–100
  const [tilesDone, setTilesDone] = useState(0);
  const [tilesTotal, setTilesTotal] = useState(0);
  const [alreadyDownloaded, setAlreadyDownloaded] = useState(false);

  // Check if this trip is already cached
  useEffect(() => {
    loadOfflineTrip(tripId)
      .then((t) => setAlreadyDownloaded(t !== null))
      .catch(() => {});
  }, [tripId]);

  const handleDownload = useCallback(async () => {
    setState("saving");
    setProgress(0);

    try {
      // ── 1. Compute bounding box ─────────────────────────────────────────
      const coords = trip.geojson?.coordinates ?? [];
      if (coords.length < 2) throw new Error("Ingen rutedata");

      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const minLng = Math.min(...lons);
      const maxLng = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      // ── 2. Build tile URL list ──────────────────────────────────────────
      // z10–z13: good balance of coverage vs storage (~300–600 tiles typical)
      const tileUrls = buildTileUrls(minLng, minLat, maxLng, maxLat, 10, 13);
      setTilesTotal(tileUrls.length);

      // ── 3. Save trip data to IndexedDB ─────────────────────────────────
      await saveOfflineTrip({
        id: tripId,
        trip,
        cabins,
        stages,
        downloadedAt: new Date().toISOString(),
        tileCount: tileUrls.length,
      });

      // ── 4. Pre-cache tiles via Service Worker ──────────────────────────
      if (!("serviceWorker" in navigator)) throw new Error("Service Worker ikke støttet");

      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) throw new Error("Service Worker ikke aktiv");

      setState("tiles");

      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();

        channel.port1.onmessage = (e) => {
          if (e.data?.type === "TILE_PROGRESS") {
            const { done, total, complete } = e.data;
            setTilesDone(done);
            setTilesTotal(total);
            // Tile progress = 50–100 % of overall progress
            setProgress(Math.round(50 + (done / total) * 50));
            if (complete) {
              channel.port1.close();
              resolve();
            }
          }
        };

        registration.active!.postMessage(
          { type: "PRECACHE_TILES", urls: tileUrls },
          [channel.port2]
        );

        // Fallback: resolve after 60 s if SW never completes
        setTimeout(() => {
          channel.port1.close();
          resolve();
        }, 60_000);

        // Also listen for errors
        channel.port1.onmessageerror = () => { channel.port1.close(); reject(new Error("SW feil")); };
      });

      setAlreadyDownloaded(true);
      setState("done");
      setProgress(100);

    } catch (err) {
      console.error("[OfflineDownload]", err);
      setState("error");
    }
  }, [tripId, trip, cabins, stages]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteOfflineTrip(tripId);
      setAlreadyDownloaded(false);
      setState("idle");
      setProgress(0);
    } catch {
      // ignore
    }
  }, [tripId]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (state === "done" || alreadyDownloaded) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm"
          style={{ color: "var(--color-success, #0f8402)" }}>
          <CheckIcon />
          <span className="font-medium">Lastet ned for offline bruk</span>
        </div>

        <div className="flex gap-2">
          <a
            href={`/trips/${tripId}/offline`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--color-brand-500)", color: "white" }}
          >
            <MapPinIcon />
            Naviger offline →
          </a>

          <button
            onClick={handleDelete}
            className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: "var(--color-neutral-100, #f1f5f9)",
              color: "var(--color-neutral-500, #64748b)",
              border: "1px solid var(--color-border-default, #e2e8f0)",
            }}
            title="Slett offline-data"
          >
            🗑
          </button>
        </div>
      </div>
    );
  }

  if (state === "saving" || state === "tiles") {
    const label = state === "saving"
      ? "Lagrer turdata…"
      : `Laster ned kart… ${tilesDone}/${tilesTotal} tiles`;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0"
            style={{ borderColor: "var(--color-brand-400)", borderTopColor: "transparent" }}
          />
          <span className="text-sm" style={{ color: "var(--color-neutral-500)" }}>
            {label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--color-neutral-100, #f1f5f9)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "var(--color-brand-500)",
            }}
          />
        </div>
        <p className="text-xs text-right" style={{ color: "var(--color-neutral-400)" }}>
          {progress}%
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm" style={{ color: "var(--color-error, #bf0000)" }}>
          Nedlasting feilet. Prøv igjen.
        </p>
        <button
          onClick={handleDownload}
          className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
          style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-border-default)", color: "var(--color-neutral-600)" }}
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  // Idle
  return (
    <button
      onClick={handleDownload}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
      style={{
        background: "white",
        color: "var(--color-neutral-600)",
        border: "1.5px solid var(--color-border-default, #e2e8f0)",
      }}
    >
      <DownloadIcon />
      Last ned for offline bruk
    </button>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
