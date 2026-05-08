import { z } from "zod";
import type { TripInput } from "@/types";

// ─── Zod schema for packing list validation ──────────────────────────────────
export const PackingItemSchema = z.object({
  category: z.string(),
  item: z.string(),
  quantity: z.number(),
  assignedTo: z.enum(["group", "individual"]),
  notes: z.string().optional(),
});

export const PackingListSchema = z.array(PackingItemSchema);

// ─── Prompt builder ──────────────────────────────────────────────────────────

/**
 * Build a prompt for the AI to generate a packing list based on trip details.
 * The prompt instructs the model to return ONLY a valid JSON array of packing items.
 */
export function buildPackingPrompt(input: TripInput): string {
  const {
    destinationName: name,
    startDate,
    nights,
    groupSize,
    hasKids,
    experience,
  } = input;

  const experienceLabel = {
    beginner: "Nybegynner",
    intermediate: "Erfaren",
    experienced: "Klatreekspert",
  }[experience];

  const kidInfo = hasKids ? "Ja, barn er med på turen." : "Nei, ingen barn.";

  return `Du skal hjelpe en gruppe med å pakke for en frilufttur. Generer en detaljert pakkeliste basert på disse detaljene:

Destinasjon: ${name}
Startdato: ${startDate}
Antall netter: ${nights}
Gruppestørrelse: ${groupSize} personer
Barn med på turen?: ${kidInfo}
Erfaringsnivå: ${experienceLabel}

Generer en komplett pakkeliste som JSON-array. Hver gjenstand må ha:
- category: Kategori (f.eks. "Klær", "Soveudstyr", "Mat", "Sikkerhet", "Kart & GPS")
- item: Navn på gjenstanden (på norsk)
- quantity: Antall (for "group" items, bruk gruppestørrelse; for "individual" items, bruk 1 eller antall per person)
- assignedTo: Enten "group" (deles av gruppen) eller "individual" (hver person har sin egen)
- notes: Valgfritt notat (f.eks. størrelse, spesifikkasjoner, eller viktig info på norsk)

Vær praktisk og realistisk basert på antall netter og erfaringsnivå. Inkluder essensielle gjenstander, sikkerhetsutstyr og komfortartikler.

Returner BARE det JSON-arrayene, ingenting annet. Ingen markdown, ingen forklaring.`;
}
