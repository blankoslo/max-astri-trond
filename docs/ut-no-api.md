# UT.no GraphQL API

Reverse-engineered from the ut.no frontend (May 2026).

## Endpoint

```
POST https://ut-backend-api-2-41145913385.europe-north1.run.app/internal/graphql
Content-Type: application/json
```

No authentication required for public data. The API is a private backend used by ut.no's own frontend, so it may change without notice.

---

## Core Queries

### 1. Search / Autocomplete

Use this to let users search for areas, cabins, and trips by name.

```graphql
query SearchAutocomplete($q: String!) {
  search(input: { searchString: $q, fullResult: false }) {
    prioritizedResult   # [String!]! — top matches
    result              # [String!]! — remaining matches
  }
}
```

Each string in `result` / `prioritizedResult` is a semicolon-delimited record:

```
{type};{id};{lon,lat};{name};{category};{grading}
```

**Examples:**
```
g;116937;10.758204,59.912712;Jotunheimstien — «i norske kunstneres fotspor»;hiking;very tough
d;101210128;8.791777,61.464006;Vargebue - Hytte i Jotunheimen, Vågå.;rental;
```

**type codes:** `g` = trip/route, `d` = cabin/destination

**Variables:**
| Param | Type | Description |
|---|---|---|
| `searchString` | `String` | Free-text query |
| `fullResult` | `Boolean` | `false` for autocomplete, `true` for full results |

---

### 2. List Areas

Look up area IDs needed for filtering trips. 3 388 areas total.

```graphql
query Areas($name: String) {
  areas(
    paging: { first: 20 }
    filter: { name: { like: $name } }
  ) {
    totalCount
    edges {
      node {
        id
        name
      }
    }
  }
}
```

**Example — find Jotunheimen:**
```graphql
{ areas(filter: { name: { like: "%Jotunheimen%" } }) {
    edges { node { id name } }
} }
```
Returns: `id: 1231, name: "Jotunheimen"`

**AreaFilter fields:**
| Field | Type |
|---|---|
| `id` | `AreaIdFilterComparison` |
| `name` | `StringFieldComparison` (`eq`, `like`, `in`) |
| `status` | `AreaStatusFilterComparison` |
| `areaType` | `AreaAreaTypeFilterComparison` |

---

### 3. List Trips (with area filter)

The primary query for fetching turforslag. Filter by area ID for geographic scoping.

```graphql
query Trips($areaId: Int, $first: Int = 20, $after: String) {
  trips(
    paging: { first: $first, after: $after }
    filter: {
      status: { eq: PUBLIC }
      areas: { id: { eq: $areaId } }   # omit to get all of Norway
    }
  ) {
    totalCount
    edges {
      node {
        id
        name
        distance          # metres
        grading           # EASY | MODERATE | TOUGH | VERY_TOUGH
        durationHours
        durationMinutes
        durationDays
        primaryActivityType  # HIKING | SKI_TOURING | CYCLING | ...
        elevationGain
        elevationMax
        description
        startPointGeojson
        geojson           # route as GeoJSON LineString
        encodedPolyline
        areas { id name }
        counties { id name }
        municipalities { id name }
        media { uri type }
        links { url title }
      }
    }
  }
}
```

**Example — 185 trips in Jotunheimen (area id 1231):**
```json
{ "areaId": 1231, "first": 10 }
```

**TripFilter fields:**
| Field | Description |
|---|---|
| `status` | Always use `{ eq: PUBLIC }` |
| `areas` | `{ id: { eq: INT } }` — filter by area ID |
| `counties` | `{ id: { eq: INT } }` — filter by county |
| `municipalities` | `{ id: { eq: INT } }` — filter by municipality |
| `name` | `{ like: "%string%" }` — text search on name |
| `grading` | `{ eq: EASY \| MODERATE \| TOUGH \| VERY_TOUGH }` |
| `primaryActivityType` | `{ eq: HIKING \| SKI_TOURING \| CYCLING \| ... }` |
| `distance` | `{ gte: INT, lte: INT }` — metres |
| `durationHours` | `{ gte: INT, lte: INT }` |

**CursorPaging:**
```graphql
paging: { first: 20, after: "cursor-from-previous-page" }
```

---

### 4. Trips Near a Coordinate

Find trips starting close to a GPS coordinate.

```graphql
query TripsNear($lon: Float!, $lat: Float!, $maxDistance: Int) {
  tripsNear(input: {
    coordinates: [$lon, $lat]   # [longitude, latitude]
    maxDistance: $maxDistance   # metres, e.g. 15000 for 15 km
  }) {
    distance   # metres from query point to trip start
    trip {
      id
      name
      distance
      grading
      durationHours
      primaryActivityType
      startPointGeojson
    }
  }
}
```

**Example — near Besseggen (lon: 8.9, lat: 61.5), within 15 km:**
Returns trips ordered by proximity, e.g. "Haute Route Ultra" at 2 981 m distance.

---

## Full Trip Fields

All available fields on the `Trip` type:

```graphql
id, status, name, provider
primaryActivityType, season
distance, grading, direction
durationDays, durationHours, durationMinutes
elevationGain, elevationLoss, elevationMax, elevationMin
description, transportGeneral, transportPublic
videoUrl, accessibilityDescription
startPointGeojson       # GeoJSON Point — trip start
geojson                 # GeoJSON LineString — full route
routeNodesGeojson       # GeoJSON LineString — waypoints
encodedPolyline         # Google-encoded polyline
media { uri type }
links { url title }
areas { id name }
counties { id name }
municipalities { id name }
activityTypes { id name }
accessibilities { id name }
suitableFor
```

---

## Known Area IDs

| ID | Name |
|---|---|
| 1231 | Jotunheimen |
| 12255 | Jotunheimen nasjonalpark |
| 124470 | Jotunheimen villreinområde |
| 12223 | Golsfjellet |
| 1275 | Gjøvik, Land og Toten |
| 12548 | Svingervann naturreservat |

Use the `areas` query with `name: { like: "%...%" }` to look up any area ID dynamically.

---

---

## 5. Cabins Near a Point

```graphql
query CabinsNear($input: FindNearInput!) {
  cabinsNear(input: $input) {
    distance    # metres from query point to cabin
    cabin {
      id name serviceLevel dntCabin
      description
      bedsStaffed bedsSelfService bedsNoService bedsWinter
      bookingEnabled bookingUrl
      email phone
      geojson     # GeoJSON Point — cabin coordinates
    }
  }
}
```

**Variables:**
| Field | Type | Description |
|---|---|---|
| `coordinates` | `[lon, lat]` | GeoJSON order (longitude first) |
| `maxDistance` | `Int` | Radius in metres |

**`serviceLevel` values:** `STAFFED` · `SELF_SERVICE` · `NO_SERVICE` · `EMERGENCY_SHELTER` · `RENTAL`

The response type is `CabinNear { distance: Int, cabin: Cabin }` — fields must be accessed through `.cabin`.

---

## 6. Cabins Along a Trip Route

The API has no native "cabins along route" query. The recommended approach is to **sample points along the trip's GeoJSON LineString** and call `cabinsNear` for each point, then deduplicate by cabin ID.

```
trip.geojson.coordinates  →  sample every N metres  →  cabinsNear(point, radius)  →  deduplicate
```

**Practical settings:**
| Use case | sampleInterval | searchRadius | Notes |
|---|---|---|---|
| Day hike (< 20 km) | 2 000 m | 2 000 m | ~10 requests |
| Multi-day (20–100 km) | 4 000 m | 3 000 m | ~25 requests |
| Long route (> 100 km) | 8 000 m | 4 000 m | keeps request count manageable |

This is implemented as `cabinsAlongRoute()` in `src/lib/apis/utno.ts` and exposed via:

```
GET /api/trips/[id]/cabins?interval=3000&radius=2000
```

**Response shape:**
```json
{
  "tripId": 112630,
  "tripName": "Topptur til Glittertinden...",
  "tripDistanceMetres": 19010,
  "samplePoints": 7,
  "totalCabins": 4,
  "cabins": [
    { "id": 101033, "name": "Spiterstulen", "serviceLevel": "STAFFED",
      "distanceFromRoute": 142, "bedsStaffed": 100, ... }
  ]
}
```

---

## Usage Notes

- **No API key needed** for public trip data.
- **Pagination** uses cursor-based paging (`first` + `after` cursor from previous response).
- **Distance** is always in **metres**.
- **Coordinates** are `[longitude, latitude]` (GeoJSON order, not lat/lon).
- The search `result` strings are `;`-delimited and must be parsed manually.
- The backend is a private internal API — no SLA or versioning guarantees.
