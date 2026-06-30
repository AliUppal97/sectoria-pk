import { expect, test, type Page } from "@playwright/test";
import {
  loginAsDhaLahoreAdmin,
  loginAsUnverifiedBuyer,
} from "./helpers/auth";

/** Seeded society slugs from packages/database/prisma/seed.ts. */
const PRIMARY_SOCIETY = "dha-lahore";
const COMPARE_SOCIETY = "bahria-town-lahore";
const PRIMARY_CITY = "lahore";

const PRIMARY_SOCIETY_PATH = `/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`;
const COMPARE_SOCIETY_PATH = `/societies/${PRIMARY_CITY}/${COMPARE_SOCIETY}`;

/** Valid-format demo CNIC accepted by the mock NADRA adapter. */
const DEMO_CNIC = "35202-1234567-1";

/** Society cards are full-card links — disambiguate via the thumbnail alt text. */
function societyCardLink(page: Page, societyName: string) {
  return page.getByRole("link", {
    name: new RegExp(`${societyName} cover image`, "i"),
  });
}

test.describe("Critical path", () => {
  test.setTimeout(120_000);

  test("browse → compare → book → verify → pay → allocate", async ({
    page,
    browser,
  }) => {
    let bookingDetailPath: string | null = null;

    await test.step("1. Browse society directory", async () => {
      await page.goto("/societies");
      await expect(
        page.getByRole("heading", { name: "Housing societies" }),
      ).toBeVisible();
      await expect(societyCardLink(page, "DHA Lahore")).toBeVisible();
      await expect(societyCardLink(page, "Bahria Town Lahore")).toBeVisible();
    });

    await test.step("2. Open a society profile", async () => {
      const profileLink = societyCardLink(page, "DHA Lahore");
      await profileLink.scrollIntoViewIfNeeded();
      await profileLink.click();
      await expect(page).toHaveURL(
        new RegExp(`/societies/${PRIMARY_CITY}/${PRIMARY_SOCIETY}`),
        { timeout: 15_000 },
      );
      await expect(
        page.getByRole("heading", { level: 1, name: /DHA Lahore/i }),
      ).toBeVisible();
    });

    await test.step("3. Open compare tool with two societies", async () => {
      await page.goto(`/compare?ids=${PRIMARY_SOCIETY},${COMPARE_SOCIETY}`);
      await expect(
        page.getByRole("heading", { name: "Society comparison" }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "DHA Lahore" }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Bahria Town Lahore" }),
      ).toBeVisible();
    });

    await test.step("4. Select a category and open the booking wizard", async () => {
      await page.goto(`${PRIMARY_SOCIETY_PATH}#inventory`);
      await expect(
        page.getByRole("heading", { name: "Categories & pricing" }),
      ).toBeVisible();
      // Second FIFO category — Buyer 1 already has a booking on the first FIFO
      // bucket for this society in the seed data.
      const fifoCategory = page
        .getByRole("link")
        .filter({ has: page.getByText("FIFO", { exact: true }) })
        .nth(1);
      await fifoCategory.scrollIntoViewIfNeeded();
      await expect(fifoCategory).toBeVisible();
      await fifoCategory.click();

      await page.getByRole("link", { name: "Start booking" }).click();
      await page.waitForURL(/\/login\?callbackUrl=/);

      await loginAsUnverifiedBuyer(page);
      await expect(page).toHaveURL(/\/dashboard\/booking\//, { timeout: 15_000 });
      await expect(
        page.getByRole("heading", { name: /Book a plot in DHA Lahore/i }),
      ).toBeVisible();
    });

    await test.step("5. Complete CNIC verification via mock NADRA adapter", async () => {
      await expect(
        page.getByRole("heading", { name: "Verify your identity" }),
      ).toBeVisible();
      await page.getByLabel("CNIC number").fill(DEMO_CNIC);
      await page.getByRole("button", { name: "Verify with NADRA" }).click();
      // A successful verify jumps straight to step 2 — the confirmation copy
      // on step 1 is not shown long enough to assert in E2E.
      await expect(page).toHaveURL(/step=2/, { timeout: 15_000 });
      await expect(
        page.getByRole("heading", { name: "Calculate your transfer tax" }),
      ).toBeVisible();
    });

    await test.step("6. Confirm tax breakdown is displayed correctly", async () => {
      await expect(
        page.getByRole("heading", { name: "Calculate your transfer tax" }),
      ).toBeVisible();
      await expect(page.getByText(/purchase tax applies/i)).toBeVisible();
      await expect(page.getByText(/Estimated total tax/i)).toBeVisible();
      await page.getByRole("button", { name: "Review breakdown" }).click();
      await expect(page).toHaveURL(/step=3/);
      await expect(
        page.getByRole("heading", { name: "Review your tax breakdown" }),
      ).toBeVisible();
      await expect(page.getByText("Total payable")).toBeVisible();
      await expect(page.getByText(/Section 236K/i)).toBeVisible();
      await page.getByRole("button", { name: "Continue to payment" }).click();
      await expect(page).toHaveURL(/step=4/);
    });

    await test.step("7. Complete the booking token payment step", async () => {
      await expect(
        page.getByRole("heading", { name: "Pay your booking token" }),
      ).toBeVisible();
      await page.getByRole("button", { name: /^Pay PKR / }).click();
      await expect(
        page.getByRole("heading", { name: "Confirm booking token payment" }),
      ).toBeVisible();
      await page.getByRole("button", { name: /^Confirm & pay PKR / }).click();
      await expect(page).toHaveURL(/step=5/, { timeout: 15_000 });
    });

    await test.step("8. Confirm allocation result shows plot number and certificate", async () => {
      await expect(page.getByText("Booking Confirmed")).toBeVisible();
      await expect(
        page.getByText("Your plot is reserved in escrow"),
      ).toBeVisible();
      await expect(page.getByText(/^SEC-/)).toBeVisible();

      const viewBooking = page.getByRole("link", { name: "View booking" });
      await expect(viewBooking).toBeVisible();
      bookingDetailPath = (await viewBooking.getAttribute("href")) ?? null;
      expect(bookingDetailPath).toMatch(/^\/dashboard\/bookings\//);

      const bookingId = bookingDetailPath!.split("/").pop();
      expect(bookingId).toBeTruthy();

      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      try {
        await loginAsDhaLahoreAdmin(adminPage);
        await adminPage.goto(`/society-portal/bookings/${bookingId}`);
        await adminPage
          .getByRole("button", { name: "Confirm receipt & allocate" })
          .click();
        const dialog = adminPage.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await dialog
          .getByRole("button", { name: /Confirm PKR .* received$/ })
          .click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });
        await expect(
          adminPage.getByRole("button", { name: "Confirm receipt & allocate" }),
        ).not.toBeVisible();
      } finally {
        await adminContext.close();
      }

      await page.goto(bookingDetailPath!);
      await expect(page.getByText("Plot reserved")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(/^Ref [A-Z0-9]+$/)).toBeVisible();
      await expect(page.getByText(/^SEC-/)).toBeVisible();
    });
  });
});
