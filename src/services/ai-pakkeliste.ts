import Anthropic from '@anthropic-ai/sdk';
import { WeatherForecast } from './weather';

export interface PackingListItem {
  category: string;
  name: string;
  quantity: number;
  perPerson: boolean;
  priority: 'essential' | 'recommended' | 'optional';
  reason: string;
  estimatedWeight?: number; // kg
}

export interface PackingListRequest {
  groupSize: number;
  duration: number; // days
  weather: WeatherForecast;
  activity: 'hiking' | 'skiing' | 'camping' | 'cycling' | 'mountaineering';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  season: 'summer' | 'winter' | 'spring' | 'autumn';
  accommodationType?: 'tent' | 'cabin' | 'hotel' | 'bivouac';
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
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generatePackingList(request: PackingListRequest): Promise<PackingListResponse> {
    const prompt = this.buildPrompt(request);
    
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
      }

      return this.parseClaudeResponse(response.text);
    } catch (error) {
      console.error('Error generating packing list:', error);
      throw new Error('Failed to generate packing list');
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
- Overnatting: ${request.accommodationType || 'ikke spesifisert'}

VÆRPROGNOSE:
${weatherSummary}

INSTRUKSJONER:
Lag en komplett pakkeliste på norsk som JSON med følgende struktur:

{
  "items": [
    {
      "category": "Kategori (f.eks. Klær, Mat, Utstyr, Sikkerhet)",
      "name": "Produktnavn på norsk",
      "quantity": antall,
      "perPerson": true/false,
      "priority": "essential" | "recommended" | "optional",
      "reason": "Kort begrunnelse basert på vær/aktivitet",
      "estimatedWeight": vekt_i_kg_eller_null
    }
  ],
  "totalEstimatedWeight": total_vekt_per_person_i_kg,
  "categories": ["liste", "av", "kategorier"],
  "summary": "Kort sammendrag av pakkelisten",
  "weatherConsiderations": ["værbetingelser", "å", "huske"],
  "tips": ["praktiske", "tips", "for", "turen"]
}

VIKTIGE RETNINGSLINJER:
- Tilpass til norske forhold og værtyper
- Vær spesifikk på utstyr (f.eks. "Hardshell regnjakke" ikke bare "jakke")
- Inkluder sikkerhetsutstyr relevant for aktiviteten
- Ta hensyn til gruppestørrelse for fellesutstyr
- Juster for erfaringsnivå (nybegynnere trenger mer sikkerhet)
- Vurder vekt for flerdarsturer
- Kun JSON-respons, ingen annen tekst

Svar kun med valid JSON:`
  }

  private summarizeWeather(weather: WeatherForecast): string {
    const dailySummaries = weather.daily.slice(0, 7).map((day, index) => {
      return `Dag ${index + 1} (${day.date}): ${day.temperature.min}°-${day.temperature.max}°C, ${day.precipitation}mm nedbør, vind ${Math.round(day.windSpeed)}m/s, ${day.symbol}`;
    });
    
    return dailySummaries.join('\n');
  }

  private parseClaudeResponse(response: string): PackingListResponse {
    try {
      // Extract JSON from response (in case Claude adds explanatory text)
      let jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }
      
      let jsonString = jsonMatch[0];
      
      // Handle truncated JSON by attempting to fix common issues
      if (!jsonString.endsWith('}')) {
        console.warn('JSON appears truncated, attempting to fix...');
        // Try to close incomplete arrays and objects
        let openBrackets = (jsonString.match(/\[/g) || []).length - (jsonString.match(/\]/g) || []).length;
        let openBraces = (jsonString.match(/\{/g) || []).length - (jsonString.match(/\}/g) || []).length;
        
        // Add missing closing brackets and braces
        jsonString += ']'.repeat(openBrackets);
        jsonString += '}'.repeat(openBraces);
      }
      
      const parsed = JSON.parse(jsonString);
      
      // Validate required fields
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Invalid items array in response');
      }
      
      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        throw new Error('Invalid categories array in response');
      }

      // Calculate total weight if not provided
      if (typeof parsed.totalEstimatedWeight !== 'number') {
        const personalWeight = parsed.items
          .filter((item: PackingListItem) => item.perPerson && item.estimatedWeight)
          .reduce((sum: number, item: PackingListItem) => sum + (item.estimatedWeight || 0) * (item.quantity || 1), 0);
        
        const sharedWeight = parsed.items
          .filter((item: PackingListItem) => !item.perPerson && item.estimatedWeight)
          .reduce((sum: number, item: PackingListItem) => sum + (item.estimatedWeight || 0) * (item.quantity || 1), 0);
        
        parsed.totalEstimatedWeight = personalWeight + (sharedWeight / Math.max(1, parsed.groupSize || 1));
      }

      return {
        items: parsed.items,
        totalEstimatedWeight: parsed.totalEstimatedWeight,
        categories: parsed.categories,
        summary: parsed.summary || 'AI-generert pakkeliste',
        weatherConsiderations: parsed.weatherConsiderations || [],
        tips: parsed.tips || []
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      console.error('Raw response:', response);
      throw new Error('Failed to parse AI response');
    }
  }
}

export const aiPackingListService = new AIPackingListService();