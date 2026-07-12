import { expect, test, type Page } from "@playwright/test";

/**
 * Homepage → directory discovery happy path (H6 / foundations §1.3).
 * Fixtures: packages/database/prisma/seed.ts + seed-urban-city-lahore.ts.
 */
const PRIMARY_CITY = "lahore";
const PRIMARY_SOCIETY = "urban-city-lahore";
const PRIMARY_SOCIETY_NAME = "Urban City Lahore";

/** Society cards are full-card links — disambiguate via the card title heading. */
function societyCardLink(page: Page, societyName: string) {
  return page.getByRole("link").filter({
    has: page.getByRole("heading", { level: 3, name: societyName }),
  });
}

/**
 * DualSelect keeps a native `<select>` (`md:hidden`) and a Radix combobox
 * (`hidden md:flex`). Desktop Chromium sees the Radix trigger only — pick by
 * accessible name + option label (not the hidden native control).
 */
async function selectDiscoveryFilter(
  page: Page,
  ariaLabel: string,
  optionLabel: string,
) {
  await page.getByRole("combobox", { name: ariaLabel }).click();
  await page.getByRole("option", { name: optionLabel, exact: true }).click();
}

test.describe("Homepage discovery funnel", () => {
  test.setTimeout(120_000);

  test("home search → directory results → society profile", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Buy property in Pakistan/i,
      }),
    ).toBeVisible();

    await page
      .getByRole("combobox", { name: "Search societies or cities" })
      .fill(PRIMARY_SOCIETY_NAME);
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(
      /\/societies\?search=Urban\+City\+Lahore/,
    );

    await expect(
      page.getByRole("heading", { name: "Housing societies" }),
    ).toBeVisible();
    await expect(page.getByText(/\d+ societ(y|ies)/)).toBeVisible();
    await expect(societyCardLink(page, PRIMARY_SOCIETY_NAME)).toBeVisible();

    await societyCardLink(page, PRIMARY_SOCIETY_NAME).click();
    await expect(page).toHaveURL(
      `/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: PRIMARY_SOCIETY_NAME }),
    ).toBeVisible();
  });

  test("directory plotType and budget filters update URL and results", async ({
    page,
  }) => {
    await page.goto("/societies");
    await expect(
      page.getByRole("heading", { name: "Housing societies" }),
    ).toBeVisible();

    const countBefore = await page.getByText(/\d+ societ(y|ies)/).textContent();

    await selectDiscoveryFilter(page, "Filter by plot type", "Residential");

    await expect(page).toHaveURL(/plotType=RESIDENTIAL/);
    await expect(page.getByText(/\d+ societ(y|ies)/)).toBeVisible();
    // Seeded societies all have residential inventory — results stay non-empty.
    await expect(societyCardLink(page, PRIMARY_SOCIETY_NAME)).toBeVisible();

    // Budget band only Urban City fits (seed startingPricePkr ~870k).
    await selectDiscoveryFilter(page, "Filter by budget", "Under 50 lakh");
    await expect(page).toHaveURL(/priceMaxPkr=5000000/);
    await expect(page).toHaveURL(/plotType=RESIDENTIAL/);
    await expect(page.getByText(/1 society/)).toBeVisible();
    await expect(societyCardLink(page, PRIMARY_SOCIETY_NAME)).toBeVisible();

    expect(countBefore).not.toMatch(/^1 society$/);
  });

  test("discovery surfaces never show Book Now; Get best price reaches support", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: /Book Now/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: /Book Now/i })).toHaveCount(0);

    // Next-step band (homepage-ia §2) — concierge conversion path.
    const nextStepBand = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Ready for the next step?" }),
    });
    await nextStepBand.getByRole("link", { name: "Get best price" }).click();
    await expect(page).toHaveURL(/\/support/);
    await expect(
      page.getByRole("heading", { name: "Talk to a Sectoria advisor" }),
    ).toBeVisible();

    await page.goto("/societies");
    await expect(page.getByRole("button", { name: /Book Now/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: /Book Now/i })).toHaveCount(0);

    // Footer support path remains reachable from the directory.
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Get best price" })
      .click();
    await expect(page).toHaveURL(/\/support/);
  });
});
