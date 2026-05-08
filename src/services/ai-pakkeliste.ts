import Anthropic from "@anthropic-ai/sdk";
import { WeatherForecast } from "./weather";

export interface PackingListItem {
  category: string;
  name: string;
  quantity: number;
  perPerson: boolean;
  priority: "essential" | "recommended" | "optional";
  reason: string;
  estimatedWeight?: number; // kg
}

export interface PackingListRequest {
  groupSize: number;
  duration: number; // days
  weather: WeatherForecast;
  activity: "hiking" | "skiing" | "camping" | "cycling" | "mountaineering";
  experienceLevel: "beginner" | "intermediate" | "advanced";
  season: "summer" | "winter" | "spring" | "autumn";
  accommodationType?: "tent" | "cabin" | "hotel" | "bivouac";
}

export interface PackingListResponse {
  items: PackingListItem[];
  totalEstimatedWeight: number; // kg per person
  categories: string[];
  summary: string;
  weatherConsiderations: string[];
  tips: string[];
}

class AIPackingListService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generatePackingList(
    request: PackingListRequest,
  ): Promise<PackingListResponse> {
    const prompt = this.buildPrompt(request);
    console.log("Generated prompt for AI:", prompt);

    try {
      console.log(this.anthropic.apiKey);
      const message = await this.anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== "text") {
        throw new Error("Unexpected response format from Claude");
      }
      console.log("Claude response:", response);
      return this.parseClaudeResponse(response.text);
    } catch (error) {
      console.error("Error generating packing list:", error);
      throw new Error("Failed to generate packing list");
    }
  }

  private buildPrompt(request: PackingListRequest): string {
    const weatherSummary = this.summarizeWeather(request.weather);

    return `Du er en ekspert på friluftsaktiviteter i Norge og skal lage en pakkeliste for en ${request.activity} tur.

TURDETALJER:
- Antall personer: ${request.groupSize}
- Varighet: ${request.duration} dager
- Aktivitet: ${request.activity}
- Erfaringsnivå: ${request.experienceLevel}
- Sesong: ${request.season}
- Overnatting: ${request.accommodationType || "ikke spesifisert"}

VÆRPROGNOSE:
${weatherSummary}

INSTRUKSJONER:
Lag bare en liste med 10-15 viktige pakke-items som JSON array:

[
  "Regnjakke",
  "Sovepose", 
  "Telt",
  "Vandrestøvler",
  "Matrasje"
]

Kun JSON array, ingen annen tekst:`;
  }

  private summarizeWeather(weather: WeatherForecast): string {
    const dailySummaries = weather.daily.slice(0, 7).map((day, index) => {
      return `Dag ${index + 1} (${day.date}): ${day.temperature.min}°-${day.temperature.max}°C, ${day.precipitation}mm nedbør, vind ${Math.round(day.windSpeed)}m/s, ${day.symbol}`;
    });

    return dailySummaries.join("\n");
  }

  private parseClaudeResponse(response: string): PackingListResponse {
    try {
      // Extract JSON from response (in case Claude adds explanatory text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      let jsonString = jsonMatch[0];

      // Handle truncated JSON by attempting to fix common issues
      if (!jsonString.endsWith("}")) {
        console.warn("JSON appears truncated, attempting to fix...");
        // Try to close incomplete arrays and objects
        const openBrackets =
          (jsonString.match(/\[/g) || []).length -
          (jsonString.match(/\]/g) || []).length;
        const openBraces =
          (jsonString.match(/\{/g) || []).length -
          (jsonString.match(/\}/g) || []).length;

        // Add missing closing brackets and braces
        jsonString += "]".repeat(openBrackets);
        jsonString += "}".repeat(openBraces);
      }
      console.log("Extracted JSON string from Claude response:", jsonString);
      const parsed = JSON.parse(jsonString);
      console.log(parsed);

      // Validate required fields
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error("Invalid items array in response");
      }

      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        throw new Error("Invalid categories array in response");
      }

      // Calculate total weight if not provided
      if (typeof parsed.totalEstimatedWeight !== "number") {
        const personalWeight = parsed.items
          .filter(
            (item: PackingListItem) => item.perPerson && item.estimatedWeight,
          )
          .reduce(
            (sum: number, item: PackingListItem) =>
              sum + (item.estimatedWeight || 0) * (item.quantity || 1),
            0,
          );

        const sharedWeight = parsed.items
          .filter(
            (item: PackingListItem) => !item.perPerson && item.estimatedWeight,
          )
          .reduce(
            (sum: number, item: PackingListItem) =>
              sum + (item.estimatedWeight || 0) * (item.quantity || 1),
            0,
          );

        parsed.totalEstimatedWeight =
          personalWeight + sharedWeight / Math.max(1, parsed.groupSize || 1);
      }

      return {
        items: parsed.items,
        totalEstimatedWeight: parsed.totalEstimatedWeight,
        categories: parsed.categories,
        summary: parsed.summary || "AI-generert pakkeliste",
        weatherConsiderations: parsed.weatherConsiderations || [],
        tips: parsed.tips || [],
      };
    } catch (error) {
      console.error("Error parsing Claude response:", error);
      console.error("Raw response:", response);
      throw new Error("Failed to parse AI response");
    }
  }
}

export const aiPackingListService = new AIPackingListService();
