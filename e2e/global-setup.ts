import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FALLBACK_ENCRYPTION_KEY, withE2eEnv } from "./env";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATABASE_PKG = path.join(ROOT, "packages/database");

/**
 * Prepares a deterministic database for the critical-path suite: apply
 * migrations, then re-seed (the seed script TRUNCATEs first).
 *
 * Prisma reads `packages/database/.env` for `DATABASE_URL`. CI sets that var
 * in the workflow; locally, ensure Postgres is reachable before running E2E.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_SKIP_DB_SETUP === "1") {
    return;
  }

  const env = withE2eEnv({
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? FALLBACK_ENCRYPTION_KEY,
  });

  execSync("pnpm exec prisma generate", {
    cwd: DATABASE_PKG,
    stdio: "inherit",
    env,
  });
  execSync("pnpm exec prisma migrate deploy", {
    cwd: DATABASE_PKG,
    stdio: "inherit",
    env,
  });
  execSync("pnpm exec prisma db seed", {
    cwd: DATABASE_PKG,
    stdio: "inherit",
    env,
  });
}
