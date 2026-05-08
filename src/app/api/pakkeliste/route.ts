import { NextRequest, NextResponse } from 'next/server';
import { aiPackingListService, PackingListRequest } from '@/services/ai-pakkeliste-simple';
// TODO: Integrate with weather service when merging branches
// import { weatherService } from '@/services/weather';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const {
      groupSize,
      duration,
      activity,
      experienceLevel,
      season,
      location, // { lat, lon, altitude? }
      accommodationType
    } = body;

    if (!groupSize || !duration || !activity || !experienceLevel || !season || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: groupSize, duration, activity, experienceLevel, season, location' },
        { status: 400 }
      );
    }

    // Validate field values
    if (typeof groupSize !== 'number' || groupSize < 1 || groupSize > 20) {
      return NextResponse.json(
        { error: 'groupSize must be a number between 1 and 20' },
        { status: 400 }
      );
    }

    if (typeof duration !== 'number' || duration < 1 || duration > 30) {
      return NextResponse.json(
        { error: 'duration must be a number between 1 and 30 days' },
        { status: 400 }
      );
    }

    const validActivities = ['hiking', 'skiing', 'camping', 'cycling', 'mountaineering'];
    if (!validActivities.includes(activity)) {
      return NextResponse.json(
        { error: `activity must be one of: ${validActivities.join(', ')}` },
        { status: 400 }
      );
    }

    const validExperienceLevels = ['beginner', 'intermediate', 'advanced'];
    if (!validExperienceLevels.includes(experienceLevel)) {
      return NextResponse.json(
        { error: `experienceLevel must be one of: ${validExperienceLevels.join(', ')}` },
        { status: 400 }
      );
    }

    const validSeasons = ['summer', 'winter', 'spring', 'autumn'];
    if (!validSeasons.includes(season)) {
      return NextResponse.json(
        { error: `season must be one of: ${validSeasons.join(', ')}` },
        { status: 400 }
      );
    }

    if (!location.lat || !location.lon) {
      return NextResponse.json(
        { error: 'location must include lat and lon coordinates' },
        { status: 400 }
      );
    }

    // Validate coordinates
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    const altitude = location.altitude ? parseFloat(location.altitude) : undefined;

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates: lat must be between -90 and 90, lon between -180 and 180' },
        { status: 400 }
      );
    }

    // TODO: Fetch weather forecast for the location when weather service is available
    // const weather = await weatherService.getWeatherForecast(lat, lon, altitude);
    
    // Mock weather data for now - replace with real weather service integration
    const weather = {
      location: { lat, lon },
      daily: [
        {
          date: new Date().toISOString().split('T')[0],
          temperature: { min: 8, max: 18, current: 12 },
          precipitation: 2.5,
          windSpeed: 3.2,
          windDirection: 180,
          symbol: 'partlycloudy_day',
          humidity: 65
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    // Build request for AI service
    const packingListRequest: PackingListRequest = {
      groupSize,
      duration,
      weather,
      activity,
      experienceLevel,
      season,
      accommodationType
    };

    // Generate packing list using Claude
    const packingList = await aiPackingListService.generatePackingList(packingListRequest);

    return NextResponse.json({
      ...packingList,
      metadata: {
        generatedAt: new Date().toISOString(),
        location: { lat, lon, altitude },
        weatherForecastDate: weather.lastUpdated
      }
    }, {
      headers: {
        'Cache-Control': 's-maxage=7200, stale-while-revalidate=14400', // Cache for 2 hours, serve stale for 4 hours
      },
    });

  } catch (error) {
    console.error('Pakkeliste API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        );
      }
      
      // TODO: Re-enable weather error handling when weather service is integrated
      // if (error.message.includes('weather')) {
      //   return NextResponse.json(
      //     { error: 'Failed to fetch weather data for location' },
      //     { status: 500 }
      //   );
      // }
    }

    return NextResponse.json(
      { error: 'Failed to generate packing list' },
      { status: 500 }
    );
  }
}