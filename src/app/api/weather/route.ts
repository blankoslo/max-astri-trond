import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/services/weather';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
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
    
    return NextResponse.json(forecast, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200', // Cache for 1 hour, serve stale for 2 hours
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
