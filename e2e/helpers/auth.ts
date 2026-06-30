import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Fixed development OTP — matches `DEV_OTP_CODE` in apps/web/auth.ts. */
export const DEV_OTP = "000000";

/**
 * Signs in via the login demo picker (enabled when `E2E_TEST=1`). Matches a
 * demo row by visible label text, then completes the OTP step.
 */
export async function loginViaDemoAccount(
  page: Page,
  accountLabel: string | RegExp,
): Promise<void> {
  if (!page.url().includes("/login")) {
    await page.goto("/login");
  }
  await page
    .getByRole("button")
    .filter({ hasText: accountLabel })
    .first()
    .click();
  await page.getByLabel("One-time code").fill(DEV_OTP);
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|society-portal|dealer-portal|admin)/, {
    timeout: 15_000,
  });
}

/** Signs in as a seeded buyer flagged Unverified on the demo picker. */
export async function loginAsUnverifiedBuyer(page: Page): Promise<void> {
  await loginViaDemoAccount(page, "Unverified");
}

/** Signs in as the DHA Lahore society administrator. */
export async function loginAsDhaLahoreAdmin(page: Page): Promise<void> {
  await loginViaDemoAccount(page, /DHA Lahore Admin/i);
}
