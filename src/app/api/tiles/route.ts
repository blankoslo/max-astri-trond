import { NextRequest, NextResponse } from "next/server";

/**
 * Tile proxy — fetches Kartverket topo tiles server-side so the browser
 * never hits the gatekeeper directly (which blocks cross-origin requests).
 *
 * URL: /api/tiles?z=5&x=16&y=9
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");

  if (!z || !x || !y) {
    return new NextResponse("Missing z/x/y", { status: 400 });
  }

  const zi = parseInt(z, 10);
  const xi = parseInt(x, 10);
  const yi = parseInt(y, 10);
  if (isNaN(zi) || isNaN(xi) || isNaN(yi) || zi < 0 || xi < 0 || yi < 0 || zi > 22) {
    return new NextResponse("Invalid z/x/y", { status: 400 });
  }

  const upstream =
    `https://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps` +
    `?layers=topo4&zoom=${zi}&x=${xi}&y=${yi}`;

  try {
    const res = await fetch(upstream, {
      headers: {
        // Kartverket requires a meaningful User-Agent
        "User-Agent": "Friluftskompis/0.1 (friluftskompis.no)",
        Referer: "https://friluftskompis.no",
      },
      // Cache tiles in the Next.js fetch cache for 24 h
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      // Fall back to OpenStreetMap if Kartverket is unavailable
      const osmUrl = `https://tile.openstreetmap.org/${zi}/${xi}/${yi}.png`;
      const osm = await fetch(osmUrl, {
        headers: {
          "User-Agent": "Friluftskompis/0.1 (friluftskompis.no)",
        },
        next: { revalidate: 86400 },
      });
      if (!osm.ok) {
        return new NextResponse(null, { status: 404 });
      }
      const osmBuf = await osm.arrayBuffer();
      return new NextResponse(osmBuf, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Tile fetch failed", { status: 502 });
  }
}
