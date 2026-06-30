import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { withE2eEnv } from "./env";

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(E2E_DIR, "..");
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(ROOT, "playwright-report") }],
  ],
  outputDir: path.join(ROOT, "test-results"),
  globalSetup: path.join(E2E_DIR, "global-setup.ts"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm --filter @sectoria/database exec prisma generate && pnpm --filter @sectoria/web build && pnpm --filter @sectoria/web start --port ${PORT}`,
    url: BASE_URL,
    cwd: ROOT,
    reuseExistingServer: false,
    timeout: 300_000,
    env: withE2eEnv({ AUTH_URL: BASE_URL, E2E_TEST: "1", NODE_ENV: "production" }),
  },
});
