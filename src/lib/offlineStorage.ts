/**
 * Friluftskompis — offline storage (F8)
 *
 * Stores downloaded trip data in IndexedDB so it survives page reloads
 * and can be accessed without a network connection.
 *
 * Schema:
 *   DB  : "fk-offline"  v1
 *   Store: "trips"  keyPath = "id"
 */

import type { UtnoTrip, UtnoCabin } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OfflineStage {
  day: number;
  startName: string;
  endName: string;
  distanceKm: number;
  estimatedHours: number;
  isOvernight: boolean;
}

export interface OfflineTrip {
  id: string;
  trip: UtnoTrip;
  cabins: UtnoCabin[];
  stages: OfflineStage[];
  downloadedAt: string; // ISO timestamp
  tileCount: number;
}

// ── IndexedDB open ────────────────────────────────────────────────────────────

const DB_NAME = "fk-offline";
const DB_VERSION = 1;
const STORE = "trips";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function saveOfflineTrip(data: OfflineTrip): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadOfflineTrip(id: string): Promise<OfflineTrip | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as OfflineTrip) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listOfflineTrips(): Promise<OfflineTrip[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineTrip[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineTrip(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function isOfflineAvailable(id: string): Promise<boolean> {
  try {
    const t = await loadOfflineTrip(id);
    return t !== null;
  } catch {
    return false;
  }
}

// ── Tile coordinate helpers ───────────────────────────────────────────────────

interface TileCoord { z: number; x: number; y: number }

function lngLatToTile(lng: number, lat: number, z: number): TileCoord {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { z, x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Returns all /api/tiles URLs needed to cover the bounding box at zoom levels
 * minZ..maxZ (inclusive). Adds a 1-tile buffer on each edge.
 */
export function buildTileUrls(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  minZ = 10,
  maxZ = 13
): string[] {
  const urls: string[] = [];

  for (let z = minZ; z <= maxZ; z++) {
    const topLeft     = lngLatToTile(minLng, maxLat, z);
    const bottomRight = lngLatToTile(maxLng, minLat, z);

    const x0 = Math.max(0, topLeft.x - 1);
    const x1 = bottomRight.x + 1;
    const y0 = Math.max(0, topLeft.y - 1);
    const y1 = bottomRight.y + 1;

    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        urls.push(`/api/tiles?z=${z}&x=${x}&y=${y}`);
      }
    }
  }

  return urls;
}
