/**
 * User story: As a trip planner, I want to search for an area, cabin name
 * or mountain peak to quickly find relevant hiking alternatives.
 *
 * AC1 — Given ≥3 chars in the search field: autocomplete suggestions appear
 * AC2 — Searching "Jotunheimen": results include areas, cabins, and mountain peaks
 * AC3 — Selecting a result: map centers on the selected location
 */
import { test, expect, type Page } from "@playwright/test";

// ── Mock data ────────────────────────────────────────────────────────────────

const JOTUNHEIMEN_MOCK = {
  results: [
    {
      type: "unknown",   // area
      id: "area-1",
      name: "Jotunheimen nasjonalpark",
      lng: 8.31,
      lat: 61.53,
      category: "Fjellområde",
      grading: "",
    },
    {
      type: "cabin",     // cabin — should be labeled "Hytte" not "Område"
      id: "2801",
      name: "Fannaråken turisthytte",
      lng: 7.91,
      lat: 61.51,
      category: "DNT hytte",
      grading: "",
    },
    {
      type: "trip",
      id: "12345",
      name: "Galdhøpiggen fra Juvasshytta",
      lng: 8.32,
      lat: 61.63,
      category: "Fjelltur",
      grading: "TOUGH",
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getStoreState(page: Page) {
  return page.evaluate(() => {
    const store = (window as unknown as Record<string, unknown>).__tripStore as
      | { getState: () => Record<string, unknown> }
      | undefined;
    return store?.getState() ?? null;
  });
}

async function gotoWithMockedTrips(page: Page) {
  await page.route("/api/trips?*", (route) =>
    route.fulfill({ json: { trips: [], totalCount: 0 } })
  );
  await page.goto("/");
}

/** Warm up Next.js lazy compilation before timing-sensitive tests. */
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.route("/api/trips?*", (route) =>
    route.fulfill({ json: { trips: [], totalCount: 0 } })
  );
  await page.route("/api/trips/autocomplete*", (route) =>
    route.fulfill({ json: JOTUNHEIMEN_MOCK })
  );
  await page.goto("/");
  await page.getByTestId("search-input").fill("Jot");
  await expect(page.getByTestId("autocomplete-dropdown")).toBeVisible({
    timeout: 10_000,
  });
  await page.close();
});

// ────────────────────────────────────────────────────────────────────────────
// AC1 — Autocomplete suggestions appear after at least three characters
// ────────────────────────────────────────────────────────────────────────────

test.describe("AC1 — Autocomplete suggestions appear after at least three characters", () => {
  test("shows suggestions after three characters are typed", async ({ page }) => {
    await gotoWithMockedTrips(page);
    await page.route("/api/trips/autocomplete*", (route) =>
      route.fulfill({ json: JOTUNHEIMEN_MOCK })
    );

    await page.getByTestId("search-input").fill("Jot");

    await expect(page.getByTestId("autocomplete-dropdown")).toBeVisible({
      timeout: 1_000,
    });
  });

  test("does not trigger search when fewer than three characters are typed", async ({ page }) => {
    // EXPECTED TO FAIL: TripSuggestions calls autocomplete for any non-empty value.
    // Fix: add `if (v.trim().length < 3) return` in handleQueryChange.
    await gotoWithMockedTrips(page);
    let callCount = 0;
    await page.route("/api/trips/autocomplete*", (route) => {
      callCount++;
      return route.fulfill({ json: JOTUNHEIMEN_MOCK });
    });

    await page.getByTestId("search-input").fill("Jo"); // 2 chars

    await page.waitForTimeout(380); // wait past debounce window

    expect(
      callCount,
      "Autocomplete was called for 2-char input. AC1 requires search to trigger only at ≥ 3 chars."
    ).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AC2 — "Jotunheimen" search returns areas, cabins and mountain peaks
// ────────────────────────────────────────────────────────────────────────────

test.describe('AC2 — "Jotunheimen" search returns areas, cabins and mountain peaks', () => {
  test("shows area results", async ({ page }) => {
    await gotoWithMockedTrips(page);
    await page.route("/api/trips/autocomplete*", (route) =>
      route.fulfill({ json: JOTUNHEIMEN_MOCK })
    );

    await page.getByTestId("search-input").fill("Jotunheimen");
    await expect(page.getByTestId("autocomplete-dropdown")).toBeVisible({
      timeout: 1_000,
    });

    await expect(
      page.getByTestId("autocomplete-dropdown").getByText("Jotunheimen nasjonalpark")
    ).toBeVisible();
  });

  test("labels cabin results as 'Hytte'", async ({ page }) => {
    // EXPECTED TO FAIL: the UI labels all non-trip types as "Område", including cabins.
    // Fix in TripSuggestions — replace:
    //   {s.type === "trip" ? "Tur" : "Område"}
    // with:
    //   {s.type === "trip" ? "Tur" : s.type === "cabin" ? "Hytte" : "Område"}
    await gotoWithMockedTrips(page);
    await page.route("/api/trips/autocomplete*", (route) =>
      route.fulfill({ json: JOTUNHEIMEN_MOCK })
    );

    await page.getByTestId("search-input").fill("Jotunheimen");
    await expect(page.getByTestId("autocomplete-dropdown")).toBeVisible({
      timeout: 1_000,
    });

    const cabinResult = page
      .getByTestId("autocomplete-dropdown")
      .locator('[data-result-type="cabin"]');

    await expect(cabinResult).toBeVisible();
    await expect(
      cabinResult,
      '"Fannaråken turisthytte" shows label "Område". Should show "Hytte" for cabin type.'
    ).toContainText("Hytte");
  });

  // NOTE: mountain peak (fjelltopp) results are not covered here.
  // UT.no autocomplete does not return peaks (no "peak" type in the API).
  // Kartverket's place name API does, but SearchBar (which uses Kartverket)
  // is not rendered on the home page. Skipped until Kartverket search is integrated.
});

// ────────────────────────────────────────────────────────────────────────────
// AC3 — Map centers on selected search result
// ────────────────────────────────────────────────────────────────────────────

test.describe("AC3 — Map centers on selected search result", () => {
  test("map is visible and navigated to selected location after switching to map tab", async ({
    page,
  }) => {
    // EXPECTED TO FAIL: selectedPlace is not set for area results (depends on AC3 test 1).
    await gotoWithMockedTrips(page);
    await page.route("/api/trips/autocomplete*", (route) =>
      route.fulfill({ json: JOTUNHEIMEN_MOCK })
    );

    await page.getByTestId("search-input").fill("Jotunheimen");
    await expect(page.getByTestId("autocomplete-dropdown")).toBeVisible({
      timeout: 1_000,
    });

    await page
      .getByTestId("autocomplete-dropdown")
      .locator('[data-result-type="unknown"]')
      .first()
      .click();

    await page.getByRole("button", { name: /Kart/ }).click();

    await expect(page.locator("canvas")).toBeVisible({ timeout: 8_000 });

    const state = await getStoreState(page);
    expect(
      state?.selectedPlace,
      "selectedPlace is null. pickSuggestion() does not call setSelectedPlace() for area results."
    ).not.toBeNull();
  });
});
