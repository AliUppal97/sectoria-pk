import { PrismaClient } from "@prisma/client";

/**
 * A single shared {@link PrismaClient} instance for the whole process.
 *
 * Why a singleton: each `new PrismaClient()` opens its own connection pool. In
 * development, Next.js hot-reload re-evaluates modules on every edit, so a naive
 * `new PrismaClient()` at module scope would leak a new pool per reload and
 * eventually exhaust Postgres connections. Caching the instance on `globalThis`
 * survives hot-reload; in production the module is evaluated once and the guard
 * is simply a no-op. See `scalability-and-performance.mdc`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
