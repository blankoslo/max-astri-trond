import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/services/weather';
import type { WeatherDay } from '@/types';
import { getWeatherEmoji } from '@/lib/apis/yr';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Accept both `lon` and `lng` so callers aren't broken by either convention
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon') ?? searchParams.get('lng');
  const altitude = searchParams.get('altitude');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat and lon' },
      { status: 400 }
    );
  }

  // Strict numeric validation to avoid accepting partial numbers like "59.91abc"
  const numericRegex = /^-?\d*\.?\d+$/;
  
  if (!numericRegex.test(lat) || !numericRegex.test(lon)) {
    return NextResponse.json(
      { error: 'Invalid coordinates: lat and lon must be valid numbers' },
      { status: 400 }
    );
  }
  
  const latNum = Number(lat);
  const lonNum = Number(lon);
  const altitudeNum = altitude && numericRegex.test(altitude) ? Number(altitude) : undefined;

  if (isNaN(latNum) || isNaN(lonNum)) {
    return NextResponse.json(
      { error: 'Invalid coordinates: lat and lon must be valid numbers' },
      { status: 400 }
    );
  }

  if (latNum < -90 || latNum > 90) {
    return NextResponse.json(
      { error: 'Invalid latitude: must be between -90 and 90' },
      { status: 400 }
    );
  }

  if (lonNum < -180 || lonNum > 180) {
    return NextResponse.json(
      { error: 'Invalid longitude: must be between -180 and 180' },
      { status: 400 }
    );
  }

  if (altitude && (!numericRegex.test(altitude) || isNaN(altitudeNum!) || altitudeNum! < -500 || altitudeNum! > 10000)) {
    return NextResponse.json(
      { error: 'Invalid altitude: must be a number between -500 and 10000 meters' },
      { status: 400 }
    );
  }

  try {
    const forecast = await weatherService.getWeatherForecast(latNum, lonNum, altitudeNum);

    // Transform internal WeatherData shape → WeatherDay (the shared type used by the UI)
    const days: WeatherDay[] = forecast.daily.map((d) => {
      const symbolCode = d.symbol || 'clearsky_day';
      const emoji = getWeatherEmoji(symbolCode);
      return {
        date:       d.date,
        symbolCode,
        tempMin:    Math.round(d.temperature.min * 10) / 10,
        tempMax:    Math.round(d.temperature.max * 10) / 10,
        precipMm:   Math.round(d.precipitation * 10) / 10,
        windMs:     Math.round(d.windSpeed * 10) / 10,
        summary:    `${Math.round(d.temperature.max)}°C, ${emoji}`,
      };
    });

    return NextResponse.json(days, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
