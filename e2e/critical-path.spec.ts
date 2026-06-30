import { expect, test, type Page } from "@playwright/test";
import {
  loginAsBuyerWithQuote,
  loginAsSkylineDealer,
  loginViaDemoAccount,
} from "./helpers/auth";

/** Seeded society slugs from packages/database/prisma/seed.ts. */
const PRIMARY_SOCIETY = "dha-lahore";
const COMPARE_SOCIETY = "bahria-town-lahore";
const PRIMARY_CITY = "lahore";

/** Society cards are full-card links — disambiguate via the thumbnail alt text. */
function societyCardLink(page: Page, societyName: string) {
  return page.getByRole("link", {
    name: new RegExp(`${societyName} cover image`, "i"),
  });
}

test.describe("Concierge critical path", () => {
  test.setTimeout(120_000);

  test("browse → compare → quote request → accept → pay token → dealer fulfillment", async ({
    page,
    browser,
  }) => {
    await test.step("1. Browse society directory", async () => {
      await page.goto("/societies");
      await expect(
        page.getByRole("heading", { name: "Housing societies" }),
      ).toBeVisible();
      await expect(societyCardLink(page, "DHA Lahore")).toBeVisible();
    });

    await test.step("1b. Society profile shows map, plans, and updates", async () => {
      await page.goto(`/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`);
      await expect(
        page.getByRole("heading", { name: "DHA Lahore" }),
      ).toBeVisible();
      await expect(page.getByText("Booking open")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Plans by category" })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Society news & milestones" }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Location & land" })).toBeVisible();
    });

    await test.step("2. Open compare tool with two societies", async () => {
      await page.goto(`/compare?ids=${PRIMARY_SOCIETY},${COMPARE_SOCIETY}`);
      await expect(
        page.getByRole("heading", { name: "Society comparison" }),
      ).toBeVisible();
    });

    await test.step("3. Submit quote request on compare page", async () => {
      await page.getByLabel("Full name").fill("E2E Concierge Buyer");
      await page.getByLabel("Phone number").fill("+923009991234");
      await page.getByRole("button", { name: "Request best price" }).click();
      await expect(page.getByText("Request received")).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("4. Buyer accepts seeded advisor quote", async () => {
      await page.goto("/login?callbackUrl=/dashboard/quotes");
      await loginAsBuyerWithQuote(page);
      await expect(page).toHaveURL(/\/dashboard\/quotes/, { timeout: 15_000 });
      await expect(page.getByRole("button", { name: "Accept quote" })).toBeVisible();
      await page.getByRole("button", { name: "Accept quote" }).click();
      await expect(page.getByRole("button", { name: "Pay booking token" })).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("5. Pay booking token with confirm dialog", async () => {
      await page.getByRole("button", { name: "Pay booking token" }).click();
      await expect(
        page.getByRole("heading", { name: "Confirm booking token payment" }),
      ).toBeVisible();
      await page.getByRole("button", { name: /^Confirm & pay PKR / }).click();
      await expect(
        page.getByText(/Sectoria is coordinating allocation/i),
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step("6. Dealer sees fulfillment order without buyer PII", async () => {
      const dealerContext = await browser.newContext();
      const dealerPage = await dealerContext.newPage();
      try {
        await loginAsSkylineDealer(dealerPage);
        await dealerPage.goto("/dealer-portal/fulfillment");
        await expect(
          dealerPage.getByRole("heading", { name: "Fulfillment orders" }),
        ).toBeVisible();
        await expect(dealerPage.getByText(/^FO-/)).toBeVisible({ timeout: 15_000 });
        await expect(dealerPage.getByText("E2E Concierge Buyer")).not.toBeVisible();
      } finally {
        await dealerContext.close();
      }
    });

    await test.step("7. Buyer dashboard shows post-token status", async () => {
      await page.goto("/dashboard");
      await expect(page.getByText(/coordinating allocation/i)).toBeVisible({
        timeout: 15_000,
      });
    });
  });
});
