interface WeatherData {
  date: string;
  temperature: {
    min: number;
    max: number;
    current: number;
  };
  precipitation: number; // mm
  windSpeed: number; // m/s
  windDirection: number; // degrees
  symbol: string; // weather symbol code
  humidity: number; // percentage
}

interface WeatherForecast {
  location: {
    lat: number;
    lon: number;
    name?: string;
  };
  daily: WeatherData[];
  lastUpdated: string;
}

interface MetNoResponse {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            air_temperature: number;
            relative_humidity: number;
            wind_speed: number;
            wind_from_direction: number;
          };
        };
        next_1_hours?: {
          summary: {
            symbol_code: string;
          };
          details: {
            precipitation_amount: number;
          };
        };
        next_6_hours?: {
          summary: {
            symbol_code: string;
          };
          details: {
            precipitation_amount: number;
          };
        };
        next_12_hours?: {
          summary: {
            symbol_code: string;
          };
          details: {
            precipitation_amount: number;
          };
        };
      };
    }>;
  };
}

class WeatherService {
  private readonly baseUrl = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
  private readonly userAgent = 'friluftskompis/1.0 kontakt@friluftskompis.no';

  async getWeatherForecast(lat: number, lon: number, altitude?: number): Promise<WeatherForecast> {
    // Round coordinates to 4 decimals as required by MET API
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    
    const params = new URLSearchParams({
      lat: roundedLat.toString(),
      lon: roundedLon.toString(),
    });

    if (altitude !== undefined) {
      params.append('altitude', altitude.toString());
    }

    const url = `${this.baseUrl}?${params}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Weather API request failed: ${response.status} ${response.statusText}`);
      }

      const data: MetNoResponse = await response.json();
      return this.transformMetNoResponse(data, { lat: roundedLat, lon: roundedLon });
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  private transformMetNoResponse(data: MetNoResponse, location: { lat: number; lon: number }): WeatherForecast {
    const timeseries = data.properties.timeseries;
    
    // Group timeseries by date
    const dailyData = new Map<string, Array<typeof timeseries[0]>>();
    
    timeseries.forEach(entry => {
      const date = entry.time.split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(entry);
    });

    // Transform to daily weather data
    const daily: WeatherData[] = Array.from(dailyData.entries()).map(([date, entries]) => {
      const temperatures = entries.map(e => e.data.instant.details.air_temperature);
      const precipitations = entries
        .map(e => e.data.next_1_hours?.details.precipitation_amount || e.data.next_6_hours?.details.precipitation_amount || 0)
        .filter(p => p > 0);
      
      const windSpeeds = entries.map(e => e.data.instant.details.wind_speed);
      const windDirections = entries.map(e => e.data.instant.details.wind_from_direction);
      const humidities = entries.map(e => e.data.instant.details.relative_humidity);

      // Get symbol from the first entry with symbol data
      const symbolEntry = entries.find(e => 
        e.data.next_1_hours?.summary?.symbol_code || 
        e.data.next_6_hours?.summary?.symbol_code || 
        e.data.next_12_hours?.summary?.symbol_code
      );
      const symbol = symbolEntry?.data.next_1_hours?.summary?.symbol_code ||
                    symbolEntry?.data.next_6_hours?.summary?.symbol_code ||
                    symbolEntry?.data.next_12_hours?.summary?.symbol_code ||
                    'clearsky_day';

      return {
        date,
        temperature: {
          min: Math.min(...temperatures),
          max: Math.max(...temperatures),
          current: temperatures[0] || 0,
        },
        precipitation: precipitations.reduce((sum, p) => sum + p, 0),
        windSpeed: windSpeeds.reduce((sum, w) => sum + w, 0) / windSpeeds.length,
        windDirection: windDirections.reduce((sum, w) => sum + w, 0) / windDirections.length,
        symbol,
        humidity: humidities.reduce((sum, h) => sum + h, 0) / humidities.length,
      };
    });

    return {
      location,
      daily: daily.slice(0, 7), // Limit to 7 days
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const weatherService = new WeatherService();
export type { WeatherData, WeatherForecast };