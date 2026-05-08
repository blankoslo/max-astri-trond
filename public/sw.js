/**
 * Friluftskompis — Service Worker (F8 Offline tilgang)
 *
 * Strategies:
 *  - /api/tiles  → Cache-first (tiles never change for the same z/x/y)
 *  - everything else  → Network-first (pass-through)
 *
 * Messages handled:
 *  { type: 'PRECACHE_TILES', urls: string[] }
 *    → fetches each URL and puts it in TILE_CACHE, posting progress back
 */

const TILE_CACHE = "fk-tiles-v1";

// ── Install / activate ────────────────────────────────────────────────────────

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("fk-tiles-") && k !== TILE_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch interception ────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept our tile proxy
  if (url.pathname.startsWith("/api/tiles")) {
    event.respondWith(tileStrategy(event.request));
  }
  // Everything else: normal network (no interception)
});

async function tileStrategy(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone()); // async, don't await
    }
    return response;
  } catch {
    // Offline and not cached → return transparent 1×1 PNG placeholder
    return new Response(
      Uint8Array.from(atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      ), (c) => c.charCodeAt(0)),
      { headers: { "Content-Type": "image/png" } }
    );
  }
}

// ── Pre-cache message ─────────────────────────────────────────────────────────

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "PRECACHE_TILES") return;

  const urls = event.data.urls;
  if (!Array.isArray(urls) || urls.length === 0) {
    event.source?.postMessage({ type: "TILE_PROGRESS", done: 0, total: 0, complete: true });
    return;
  }

  const cache = await caches.open(TILE_CACHE);
  let done = 0;
  const total = urls.length;

  for (const url of urls) {
    try {
      const existing = await cache.match(url);
      if (!existing) {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      }
    } catch {
      // Ignore individual tile failures — we soldier on
    }

    done++;
    // Throttle progress messages: every 5 tiles or at the end
    if (done % 5 === 0 || done === total) {
      event.source?.postMessage({
        type: "TILE_PROGRESS",
        done,
        total,
        complete: done === total,
      });
    }
  }
});
