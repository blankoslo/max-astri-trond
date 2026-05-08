# Friluftskompis API Collection

Bruno API test collection for the Friluftskompis application.

## Setup

1. Install [Bruno](https://usebruno.com/)
2. Open Bruno and import this folder as a collection
3. Select the "Local" environment 
4. Start the Next.js dev server: `npm run dev`

## API Endpoints

### 1. Weather Forecast (`weather.bru`)
- **GET** `/api/weather`
- Returns 7-day weather forecast from MET Norway
- **Query params**: `lat`, `lon`, `altitude` (optional)
- **Example**: Oslo coordinates (59.93, 10.72)

### 2. AI Pakkeliste (`pakkeliste.bru`)  
- **POST** `/api/pakkeliste`
- Generates AI-powered packing lists using Claude
- **Body**: Trip details (group size, duration, activity, location, etc.)
- **Example**: 4-day hiking trip in Jotunheimen for 3 intermediate hikers

### 3. Claude API Test (`test-claude.bru`)
- **GET** `/api/test-claude`
- Verifies Claude integration is working
- Returns a Norwegian greeting

## Environment Variables

Make sure you have set up your `.env.local` file with:
```
ANTHROPIC_API_KEY=your_claude_api_key_here
```

## Running Tests

1. Run individual requests by clicking the "Send" button
2. Run all tests in sequence using Bruno's collection runner
3. Check the "Tests" tab for validation results

## Example Responses

The pakkeliste endpoint returns detailed Norwegian packing lists with:
- Categorized items (Klær, Utstyr, Mat, Sikkerhet)
- Priority levels (essential, recommended, optional)
- Weather-based recommendations
- Weight estimates and sharing logic