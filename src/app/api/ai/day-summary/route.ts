/**
 * POST /api/ai/day-summary
 *
 * Generates a short AI description for each day stage of a hiking trip.
 *
 * Body:
 *   {
 *     tripName: string
 *     area: string | null
 *     grading: string | null
 *     stages: Array<{
 *       day: number
 *       startName: string
 *       endName: string
 *       distanceKm: number
 *       estimatedHours: number
 *       isOvernight: boolean
 *     }>
 *     weatherSummaries?: string[]  // optional per-day weather hint
 *   }
 *
 * Returns: string[]  — one Norwegian summary per stage (same order)
 */

import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

interface StageInput {
  day: number;
  startName: string;
  endName: string;
  distanceKm: number;
  estimatedHours: number;
  isOvernight: boolean;
}

interface RequestBody {
  tripName: string;
  area: string | null;
  grading: string | null;
  stages: StageInput[];
  weatherSummaries?: string[];
}

function buildPrompt(body: RequestBody): string {
  const { tripName, area, grading, stages, weatherSummaries = [] } = body;

  const gradingNorwegian: Record<string, string> = {
    EASY: "enkel",
    MODERATE: "moderat",
    TOUGH: "krevende",
    VERY_TOUGH: "meget krevende",
  };
  const gradingText = grading ? gradingNorwegian[grading] ?? grading : "ukjent vanskelighetsgrad";

  const stagesText = stages
    .map((s, i) => {
      const weather = weatherSummaries[i] ? ` Vær: ${weatherSummaries[i]}.` : "";
      const overnight = s.isOvernight ? ` Overnatter ved ${s.endName}.` : " Sluttmål for turen.";
      return `Dag ${s.day}: Fra ${s.startName} til ${s.endName}. ${s.distanceKm} km, ca. ${s.estimatedHours} timer.${weather}${overnight}`;
    })
    .join("\n");

  return `Du er en norsk friluftsguide. Turen heter "${tripName}"${area ? ` i ${area}` : ""}, vanskelighetsgrad: ${gradingText}.

Etapper:
${stagesText}

Skriv én kort, levende beskrivelse på norsk for hver etappe (maks 2 setninger per etappe). Fokuser på terrenget, høydepunkter og hva vandreren kan forvente seg. Nevn overnattingsstedet når det er relevant.

Returner KUN en JSON-array med én streng per etappe, i samme rekkefølge. Ingen markdown, ingen forklaring. Start med '[' og avslutt med ']'.`;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
    if (!body.tripName || !Array.isArray(body.stages) || body.stages.length === 0) {
      throw new Error("Missing required fields");
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const anthropic = createAnthropic({ apiKey });

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system:
        "Du er en erfaren norsk friluftsguide. Svar KUN med en rå JSON-array av strenger — " +
        "ingen markdown, ingen kodeblokker, ingen forklaring. Start med '[' og avslutt med ']'.",
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed) || parsed.some((s) => typeof s !== "string")) {
      throw new Error("Unexpected response shape");
    }

    // Ensure we return exactly one summary per stage
    const summaries: string[] = body.stages.map((_, i) => (parsed[i] as string) ?? "");
    return Response.json(summaries);
  } catch (error) {
    console.error("[/api/ai/day-summary] Error:", error);
    return Response.json({ error: "Failed to generate day summaries" }, { status: 500 });
  }
}
