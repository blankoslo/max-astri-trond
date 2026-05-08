/**
 * User story: As a trip planner, I want to see a topographic map with DNT cabins
 * as a map layer to get an overview of the cabin network.
 *
 * AC1 — Map loaded → user zooms to mountain area → DNT cabins visible with distinct icon
 * AC2 — Click cabin marker → detail panel opens with name, type, capacity, availability
 *
 * IMPLEMENTATION STATUS:
 *   AC1: Partially implemented. Cabins are shown via a manual toggle ("Vis hytter i området"),
 *        not automatically on zoom. The 🛏 icon is rendered as a MapLibre canvas symbol layer
 *        (not verifiable in Playwright without screenshot comparison).
 *        Tests cover: toggle visible, API called on click, count shown in button.
 *
 *   AC2: NOT IMPLEMENTED. Only a hover popup exists — no click handler, no detail panel.
 *        Canvas-level click interaction in Playwright is brittle without known pixel coords.
 *        Skipped until a click-to-panel is added.
 */
import { test, expect } from "@playwright/test";

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CABINS = {
  cabins: [
    {
      id: 1,
      name: "Fannaråken",
      serviceLevel: "STAFFED",
      dntCabin: true,
      bedsStaffed: 38,
      bedsSelfService: 0,
      bedsNoService: 0,
      bedsWinter: 10,
      bookingEnabled: true,
      bookingUrl: "https://www.dnt.no/booking/1",
      email: null,
      phone: null,
      description: null,
      geojson: { type: "Point", coordinates: [7.907, 61.512] },
    },
    {
      id: 2,
      name: "Skogadalsbøen",
      serviceLevel: "SELF_SERVICE",
      dntCabin: true,
      bedsStaffed: 0,
      bedsSelfService: 40,
      bedsNoService: 0,
      bedsWinter: 0,
      bookingEnabled: false,
      bookingUrl: null,
      email: null,
      phone: null,
      description: null,
      geojson: { type: "Point", coordinates: [7.6, 61.4] },
    },
    {
      id: 3,
      name: "Turtagrø",
      serviceLevel: "STAFFED",
      dntCabin: true,
      bedsStaffed: 60,
      bedsSelfService: 0,
      bedsNoService: 0,
      bedsWinter: 0,
      bookingEnabled: true,
      bookingUrl: "https://www.dnt.no/booking/3",
      email: null,
      phone: null,
      description: null,
      geojson: { type: "Point", coordinates: [7.8, 61.5] },
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function gotoMapTab(page: import("@playwright/test").Page) {
  await page.route("/api/trips?*", (route) =>
    route.fulfill({ json: { trips: [], totalCount: 0 } })
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Kart/ }).click();
  // Wait for MapLibre load event — set in MapInner after sources/layers added
  await expect(page.locator("[data-map-ready='true']")).toBeVisible({
    timeout: 15_000,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// AC1 — DNT cabins visible on the map with a distinct icon
// ────────────────────────────────────────────────────────────────────────────

test.describe("AC1 — DNT cabin layer toggle", () => {
  test('toggle button "Vis hytter i området" is visible on the map', async ({ page }) => {
    await gotoMapTab(page);

    await expect(
      page.getByRole("button", { name: /Vis hytter i området/ })
    ).toBeVisible();
  });

  test("clicking the toggle fetches cabins for the visible area", async ({ page }) => {
    let fetchCalled = false;
    await page.route("/api/cabins*", (route) => {
      fetchCalled = true;
      return route.fulfill({ json: MOCK_CABINS });
    });

    await gotoMapTab(page);
    await page.getByRole("button", { name: /Vis hytter i området/ }).click();

    // Loading state shows first
    await expect(page.getByRole("button", { name: /Henter hytter/ })).toBeVisible({
      timeout: 2_000,
    }).catch(() => {
      // Loading may be too fast to catch — that is fine
    });

    // Button should update to show cabin count
    await expect(
      page.getByRole("button", { name: /Skjul hytter \(3\)/ })
    ).toBeVisible({ timeout: 3_000 });

    expect(fetchCalled, "GET /api/cabins was not called after clicking the toggle.").toBe(true);
  });

  test("clicking the toggle again hides cabins", async ({ page }) => {
    await page.route("/api/cabins*", (route) =>
      route.fulfill({ json: MOCK_CABINS })
    );

    await gotoMapTab(page);

    const toggle = page.getByRole("button", { name: /Vis hytter i området/ });
    await toggle.click();

    await expect(
      page.getByRole("button", { name: /Skjul hytter/ })
    ).toBeVisible({ timeout: 3_000 });

    // Click again to hide
    await page.getByRole("button", { name: /Skjul hytter/ }).click();

    await expect(
      page.getByRole("button", { name: /Vis hytter i området/ })
    ).toBeVisible();
  });

  // NOTE: verifying that the 🛏 icon appears on the MapLibre canvas is not feasible
  // via Playwright DOM queries. The cabin symbol layer is rendered directly to <canvas>
  // by MapLibre and requires screenshot/pixel comparison to verify visually.
});

// ────────────────────────────────────────────────────────────────────────────
// AC2 — Click cabin marker → detail panel
// SKIPPED: not implemented. Hover popup only, no click-to-panel.
// ────────────────────────────────────────────────────────────────────────────

// To implement AC2:
// 1. Add a "click" handler to the ALL_CAB_LAYER in MapInner.tsx
// 2. On click, call setSelectedPlace() or open a dedicated CabinDetailPanel
// 3. The panel should show: name, service level, total beds, availability/booking link
// 4. Once the panel exists, test it by: clicking a known pixel on the canvas
//    where a mocked cabin is rendered, then asserting panel content in the DOM.
