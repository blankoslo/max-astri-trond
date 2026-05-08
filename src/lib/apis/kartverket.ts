import type { Place } from "@/types";

interface KartverketResponse {
  navn: Array<{
    stedsnummer: number;
    stedsnavn: Array<{ skrivemåte: string }>;
    navneobjekttype?: string;
    kommuner?: Array<{ kommunenavn: string }>;
    fylker?: Array<{ fylkesnavn: string }>;
    representasjonspunkt?: {
      øst: number;
      nord: number;
    };
  }>;
}

/**
 * Search for Norwegian places using the Kartverket Stedsnavn API
 * No API key required
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      sok: query,
      fuzzy: "true",
      treffPerSide: "8",
      side: "1",
    });

    const response = await fetch(
      `https://ws.geonorge.no/stedsnavn/v1/sted?${params.toString()}`
    );

    if (!response.ok) {
      console.error(`Kartverket API error: ${response.status}`);
      return [];
    }

    const data: KartverketResponse = await response.json();

    return (data.navn || []).map((item) => {
      const primaryName = item.stedsnavn?.[0]?.skrivemåte || "";
      const municipality = item.kommuner?.[0]?.kommunenavn;
      const county = item.fylker?.[0]?.fylkesnavn;
      const coords = item.representasjonspunkt;

      return {
        id: String(item.stedsnummer),
        name: primaryName,
        municipality,
        county,
        lat: coords?.nord ?? 0,
        lng: coords?.øst ?? 0,
        type: item.navneobjekttype,
      };
    });
  } catch (error) {
    console.error("Failed to search places:", error);
    return [];
  }
}
