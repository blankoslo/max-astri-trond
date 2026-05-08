import Anthropic from '@anthropic-ai/sdk';
import { WeatherForecast } from './weather';

export interface PackingListItem {
  category: string;
  name: string;
  quantity: number;
  perPerson: boolean;
  priority: 'essential' | 'recommended' | 'optional';
  reason: string;
  estimatedWeight?: number;
}

export interface PackingListRequest {
  groupSize: number;
  duration: number;
  weather: WeatherForecast;
  activity: 'hiking' | 'skiing' | 'camping' | 'cycling' | 'mountaineering';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  season: 'summer' | 'winter' | 'spring' | 'autumn';
  accommodationType?: 'tent' | 'cabin' | 'hotel' | 'bivouac';
}

export interface PackingListResponse {
  items: PackingListItem[];
  totalEstimatedWeight: number;
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
        max_tokens: 1000,
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
    
    return `${request.activity} tur i Norge: ${request.groupSize} personer, ${request.duration} dager, ${request.season}, ${request.experienceLevel} nivå.

Vær: ${weatherSummary}

Lag en enkel liste med 10-15 viktige pakke-items som JSON array:

["Regnjakke", "Sovepose", "Telt"]

Kun JSON array:`;
  }

  private summarizeWeather(weather: WeatherForecast): string {
    const day = weather.daily[0];
    return `${day.temperature.min}-${day.temperature.max}°C, ${day.precipitation}mm nedbør`;
  }

  private parseClaudeResponse(response: string): PackingListResponse {
    try {
      // Extract JSON array
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found');
      }
      
      const itemNames: string[] = JSON.parse(jsonMatch[0]);
      
      // Convert to full structure
      const items: PackingListItem[] = itemNames.map(name => ({
        category: this.categorizeItem(name),
        name,
        quantity: 1,
        perPerson: true,
        priority: 'essential' as const,
        reason: 'AI anbefaling',
        estimatedWeight: 0.5
      }));

      const categories = [...new Set(items.map(item => item.category))];

      return {
        items,
        totalEstimatedWeight: items.length * 0.5,
        categories,
        summary: `AI-generert pakkeliste med ${items.length} items`,
        weatherConsiderations: [],
        tips: []
      };
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error('Failed to parse response');
    }
  }

  private categorizeItem(itemName: string): string {
    const name = itemName.toLowerCase();
    if (name.includes('jakke') || name.includes('bukse') || name.includes('sko')) {
      return 'Klær';
    }
    if (name.includes('telt') || name.includes('sovepose')) {
      return 'Utstyr';
    }
    if (name.includes('mat') || name.includes('kaffe')) {
      return 'Mat';
    }
    return 'Utstyr';
  }
}

export const aiPackingListService = new AIPackingListService();