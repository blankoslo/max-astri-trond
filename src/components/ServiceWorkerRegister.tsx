"use client";

import { useEffect } from "react";

/**
 * Registers the Friluftskompis Service Worker (F8 offline support).
 * Mounted once in the root layout — no visible UI.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => {
        // Non-fatal — app works fine without SW, just no offline caching
        console.warn("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
