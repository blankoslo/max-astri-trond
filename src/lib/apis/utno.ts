/**
 * UT.no GraphQL API client
 *
 * Endpoint: https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql
 * No authentication required for public data.
 * Reverse-engineered from the ut.no frontend — may change without notice.
 *
 * See docs/ut-no-api.md for full documentation.
 */

import type { UtnoTrip, UtnoTripsResult, TripGrading, TripActivityType, UtnoCabin } from "@/types";

const GQL_ENDPOINT =
  "https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql";

// ─── Shared GQL fetch helper ──────────────────────────────────────────────────

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 }, // cache 5 min on Next.js edge/server
  });

  if (!res.ok) {
    throw new Error(`UT.no GQL error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(`UT.no GQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  return json.data as T;
}

// ─── Trip fragment ────────────────────────────────────────────────────────────

const TRIP_FIELDS = `
  id
  name
  distance
  grading
  durationHours
  durationMinutes
  durationDays
  elevationGain
  elevationMax
  primaryActivityType
  description
  startPointGeojson
  encodedPolyline
  areas { id name }
  counties { id name }
  media { uri type }
`;

// ─── Single trip by ID ───────────────────────────────────────────────────────

/**
 * Fetch a single trip by its numeric ID, including full route geometry.
 * Returns null if not found.
 */
export async function gqlTripById(id: number): Promise<UtnoTrip | null> {
  const data = await gql<{ trips: { edges: { node: UtnoTrip }[] } }>(
    `query TripById($id: Int!) {
      trips(filter: { id: { eq: $id } }, paging: { first: 1 }) {
        edges { node { ${TRIP_FIELDS} geojson } }
      }
    }`,
    { id }
  );
  return data.trips.edges[0]?.node ?? null;
}

// ─── Area lookup ──────────────────────────────────────────────────────────────

/**
 * Resolve an area name to its numeric ID.
 * Returns the first match, or null if not found.
 */
export async function resolveAreaId(name: string): Promise<number | null> {
  const data = await gql<{
    areas: { edges: { node: { id: number; name: string } }[] };
  }>(
    `query ResolveArea($name: String!) {
      areas(filter: { name: { like: $name } }, paging: { first: 1 }) {
        edges { node { id name } }
      }
    }`,
    { name: `%${name}%` }
  );

  return data.areas.edges[0]?.node.id ?? null;
}

// ─── Search params ────────────────────────────────────────────────────────────

export interface TripSearchParams {
  /** Filter by numeric area ID (use resolveAreaId to look up by name) */
  areaId?: number;
  /** Filter by grading level */
  grading?: TripGrading;
  /** Filter by primary activity type */
  activityType?: TripActivityType;
  /** Minimum distance in metres */
  minDistance?: number;
  /** Maximum distance in metres */
  maxDistance?: number;
  /** Maximum duration in hours */
  maxDurationHours?: number;
  /** Number of results per page (default: 20, max: 100) */
  limit?: number;
  /** Cursor from a previous response's nextCursor for pagination */
  after?: string;
}

// ─── Main search ──────────────────────────────────────────────────────────────

/**
 * Search trips with optional area, grading, activity type, and distance filters.
 */
export async function searchTrips(params: TripSearchParams = {}): Promise<UtnoTripsResult> {
  const { areaId, grading, activityType, minDistance, maxDistance, maxDurationHours, limit = 20, after } = params;

  // Build filter object
  const filter: Record<string, unknown> = {
    status: { eq: "PUBLIC" },
  };
  if (areaId != null) filter.areas = { id: { eq: areaId } };
  if (grading) filter.grading = { eq: grading };
  if (activityType) filter.primaryActivityType = { eq: activityType };
  if (minDistance != null || maxDistance != null) {
    filter.distance = {
      ...(minDistance != null && { gte: minDistance }),
      ...(maxDistance != null && { lte: maxDistance }),
    };
  }
  if (maxDurationHours != null) {
    filter.durationHours = { lte: maxDurationHours };
  }

  const paging: Record<string, unknown> = { first: Math.min(limit, 100) };
  if (after) paging.after = after;

  const data = await gql<{
    trips: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: { node: UtnoTrip }[];
    };
  }>(
    `query SearchTrips($filter: TripFilter!, $paging: CursorPaging!) {
      trips(filter: $filter, paging: $paging) {
        totalCount
        pageInfo { hasNextPage endCursor }
        edges { node { ${TRIP_FIELDS} } }
      }
    }`,
    { filter, paging }
  );

  return {
    trips: data.trips.edges.map((e) => e.node),
    totalCount: data.trips.totalCount,
    nextCursor: data.trips.pageInfo.hasNextPage ? data.trips.pageInfo.endCursor : null,
  };
}

// ─── Nearby trips ─────────────────────────────────────────────────────────────

export interface NearbyTripsParams {
  /** Longitude (GeoJSON order) */
  lng: number;
  /** Latitude */
  lat: number;
  /** Search radius in metres (default: 10 000) */
  radiusMetres?: number;
}

export interface NearbyTrip {
  /** Distance from query point to trip start, in metres */
  distanceFromPoint: number;
  trip: UtnoTrip;
}

/**
 * Find trips near a GPS coordinate, ordered by proximity.
 */
export async function tripsNear(params: NearbyTripsParams): Promise<NearbyTrip[]> {
  const { lng, lat, radiusMetres = 10_000 } = params;

  const data = await gql<{
    tripsNear: { distance: number; trip: UtnoTrip }[];
  }>(
    `query TripsNear($input: FindNearInput!) {
      tripsNear(input: $input) {
        distance
        trip { ${TRIP_FIELDS} }
      }
    }`,
    { input: { coordinates: [lng, lat], maxDistance: radiusMetres } }
  );

  return data.tripsNear.map((r) => ({
    distanceFromPoint: r.distance,
    trip: r.trip,
  }));
}

// ─── Cabin helpers ────────────────────────────────────────────────────────────

const CABIN_FIELDS = `
  id name serviceLevel dntCabin
  description
  bedsStaffed bedsSelfService bedsNoService bedsWinter
  bookingEnabled bookingUrl
  email phone
  geojson
`;

/** Haversine distance in metres between two [lon, lat] points */
function haversineMetres(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number]
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Sample evenly-spaced points along a GeoJSON LineString coordinate array.
 * Returns one point every `intervalMetres`, plus the last point.
 */
function sampleRoutePoints(
  coords: [number, number][],
  intervalMetres: number
): [number, number][] {
  const sampled: [number, number][] = [coords[0]];
  let accumulated = 0;
  for (let i = 1; i < coords.length; i++) {
    accumulated += haversineMetres(coords[i - 1], coords[i]);
    if (accumulated >= intervalMetres) {
      sampled.push(coords[i]);
      accumulated = 0;
    }
  }
  const last = coords[coords.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

// ─── Cabins along a route ─────────────────────────────────────────────────────

export interface CabinsAlongRouteParams {
  /**
   * GeoJSON LineString coordinates from a `UtnoTrip.geojson`.
   * Format: `[[lon, lat], ...]` — elevation (3rd element) is stripped automatically.
   */
  routeCoordinates: number[][];
  /**
   * How often to sample a point along the route (default: 3 000 m).
   * Smaller = more API calls but tighter coverage. Recommended: 2 000–5 000 m.
   */
  sampleIntervalMetres?: number;
  /**
   * Radius around each sample point to search for cabins (default: 2 000 m).
   * Should be ≥ sampleIntervalMetres/2 to avoid gaps.
   */
  searchRadiusMetres?: number;
  /** Concurrency limit for parallel GQL requests (default: 5) */
  concurrency?: number;
}

/**
 * Find all cabins within `searchRadiusMetres` of a trip route.
 *
 * Strategy: sample points along the GeoJSON LineString every `sampleIntervalMetres`,
 * call `cabinsNear` for each point in parallel, then deduplicate by cabin ID
 * keeping the minimum distance to the route.
 *
 * Returns cabins sorted by their closest approach to the route.
 */
export async function cabinsAlongRoute(
  params: CabinsAlongRouteParams
): Promise<UtnoCabin[]> {
  const {
    routeCoordinates,
    sampleIntervalMetres = 3_000,
    searchRadiusMetres = 2_000,
    concurrency = 5,
  } = params;

  // Strip elevation to get plain [lon, lat] pairs
  const coords = routeCoordinates.map(
    (c) => [c[0], c[1]] as [number, number]
  );

  const samplePoints = sampleRoutePoints(coords, sampleIntervalMetres);

  // Run cabinsNear queries in batches to avoid flooding the API
  const seen = new Map<number, UtnoCabin>();

  for (let i = 0; i < samplePoints.length; i += concurrency) {
    const batch = samplePoints.slice(i, i + concurrency);

    const results = await Promise.all(
      batch.map(([lon, lat]) =>
        gql<{ cabinsNear: { distance: number; cabin: UtnoCabin }[] }>(
          `query CabinsNear($input: FindNearInput!) {
            cabinsNear(input: $input) {
              distance
              cabin { ${CABIN_FIELDS} }
            }
          }`,
          { input: { coordinates: [lon, lat], maxDistance: searchRadiusMetres } }
        ).catch(() => ({ cabinsNear: [] })) // gracefully skip failed batch items
      )
    );

    for (const result of results) {
      for (const { distance, cabin } of result.cabinsNear) {
        const existing = seen.get(cabin.id);
        if (!existing || distance < (existing.distanceFromRoute ?? Infinity)) {
          seen.set(cabin.id, { ...cabin, distanceFromRoute: distance });
        }
      }
    }
  }

  return [...seen.values()].sort(
    (a, b) => (a.distanceFromRoute ?? 0) - (b.distanceFromRoute ?? 0)
  );
}

// ─── Autocomplete search ──────────────────────────────────────────────────────

export interface AutocompleteResult {
  type: "trip" | "cabin" | "unknown";
  id: string;
  name: string;
  lng: number;
  lat: number;
  category: string;
  grading: string;
}

/**
 * Autocomplete search — returns areas, trips, and cabins matching a query string.
 * Results are semicolon-delimited strings from the API, parsed into objects.
 */
export async function autocomplete(query: string): Promise<AutocompleteResult[]> {
  if (!query.trim()) return [];

  const data = await gql<{
    search: { prioritizedResult: string[]; result: string[] };
  }>(
    `query Autocomplete($input: SearchAutoCompleteInput!) {
      search(input: $input) {
        prioritizedResult
        result
      }
    }`,
    { input: { searchString: query, fullResult: false } }
  );

  const all = [...data.search.prioritizedResult, ...data.search.result];

  return all.map((raw) => {
    // Format: {type};{id};{lon,lat};{name};{category};{grading}
    const [typeCode, id, coords, name, category, grading] = raw.split(";");
    const [lng, lat] = (coords ?? "0,0").split(",").map(Number);
    const type = typeCode === "g" ? "trip" : typeCode === "d" ? "cabin" : "unknown";
    return { type, id: id ?? "", name: name ?? "", lng, lat, category: category ?? "", grading: grading ?? "" };
  });
}
