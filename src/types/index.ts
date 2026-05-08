// ─── Place (search result) ────────────────────────────────────────────────────
export interface Place {
  id: string;
  name: string;
  municipality?: string;
  county?: string;
  lat: number;
  lng: number;
  type?: string; // fjell, sted, hytte, …
}

// ─── Weather ──────────────────────────────────────────────────────────────────
export interface WeatherDay {
  date: string; // ISO date "2026-05-08"
  symbolCode: string; // Yr symbol code e.g. "clearsky_day"
  tempMin: number;
  tempMax: number;
  precipMm: number;
  windMs: number;
  summary: string;
}

// ─── Packing list ─────────────────────────────────────────────────────────────
export interface PackingItem {
  category: string;
  item: string;
  quantity: number;
  assignedTo: "group" | "individual";
  notes?: string;
}

// ─── UT.no Cabin ──────────────────────────────────────────────────────────────
export type CabinServiceLevel =
  | "STAFFED"
  | "SELF_SERVICE"
  | "NO_SERVICE"
  | "EMERGENCY_SHELTER"
  | "RENTAL";

export interface UtnoCabin {
  id: number;
  name: string;
  serviceLevel: CabinServiceLevel | null;
  dntCabin: boolean;
  /** Distance from the query point or route in metres */
  distanceFromRoute?: number;
  description: string | null;
  bedsStaffed: number | null;
  bedsSelfService: number | null;
  bedsNoService: number | null;
  bedsWinter: number | null;
  bookingEnabled: boolean | null;
  bookingUrl: string | null;
  email: string | null;
  phone: string | null;
  /** GeoJSON Point — cabin location */
  geojson: { type: "Point"; coordinates: [number, number] } | null;
}

// ─── UT.no Trip ───────────────────────────────────────────────────────────────
export type TripGrading = "EASY" | "MODERATE" | "TOUGH" | "VERY_TOUGH";
export type TripActivityType =
  | "HIKING"
  | "SKI_TOURING"
  | "CYCLING"
  | "CLIMBING"
  | "PADDLING"
  | "OTHER";

export interface UtnoTrip {
  id: number;
  name: string;
  /** metres */
  distance: number | null;
  grading: TripGrading | null;
  durationHours: number | null;
  durationMinutes: number | null;
  durationDays: number | null;
  elevationGain: number | null;
  elevationMax: number | null;
  primaryActivityType: TripActivityType | null;
  description: string | null;
  startPointGeojson: { type: "Point"; coordinates: [number, number] } | null;
  /** Full route as a GeoJSON LineString — coordinates are [lon, lat, elevation?] */
  geojson: { type: "LineString"; coordinates: number[][] } | null;
  encodedPolyline: string | null;
  areas: Array<{ id: number; name: string }>;
  counties: Array<{ id: number; name: string }>;
  media: Array<{ uri: string; type: string }>;
}

export interface UtnoTripsResult {
  trips: UtnoTrip[];
  totalCount: number;
  /** cursor for next page — pass as `after` param */
  nextCursor: string | null;
}

// ─── Trip planning input ──────────────────────────────────────────────────────
export interface TripInput {
  destinationName: string;
  startDate: string; // "YYYY-MM-DD"
  nights: number;
  groupSize: number;
  hasKids: boolean;
  experience: "beginner" | "intermediate" | "experienced";
}
