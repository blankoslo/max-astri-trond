/** Shared types for offline / PDF export (F8) */

export interface OfflineStage {
  day: number;
  startName: string;
  endName: string;
  distanceKm: number;
  estimatedHours: number;
  isOvernight: boolean;
}
