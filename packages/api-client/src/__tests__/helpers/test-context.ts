import type { PrismaClient } from "@sectoria/database";
import { createVerificationAdapters } from "@sectoria/verification";
import { createStorageAdapter } from "@sectoria/storage";
import { UserRole, idSchema, type Id } from "@sectoria/types";
import {
  appRouter,
  createCallerFactory,
  createTRPCContext,
  type Session,
} from "../../index.js";

/** A fixed point in time so every generated timestamp is deterministic. */
const FIXED_NOW = new Date("2026-06-01T00:00:00.000Z");

const asId = (value: string): Id => idSchema.parse(value);

/** Builds a NADRA-verified (by default) buyer session. */
export function buyerSession(
  id: string,
  options: { nadraVerified?: boolean } = {},
): Session {
  return {
    user: {
      id: asId(id),
      role: UserRole.BUYER,
      nadraVerified: options.nadraVerified ?? true,
    },
  };
}

/** Builds a society-admin session scoped to one society. */
export function societyAdminSession(id: string, societyId: string): Session {
  return {
    user: {
      id: asId(id),
      role: UserRole.SOCIETY_ADMIN,
      nadraVerified: true,
      societyId: asId(societyId),
    },
  };
}

/** Builds a dealer-partner session. */
export function dealerSession(id: string): Session {
  return {
    user: { id: asId(id), role: UserRole.DEALER_PARTNER, nadraVerified: true },
  };
}

/** Builds a super-admin session. */
export function superAdminSession(id: string): Session {
  return {
    user: { id: asId(id), role: UserRole.SUPER_ADMIN, nadraVerified: true },
  };
}

/** Builds a sales-advisor (ops) session. */
export function salesAdvisorSession(id: string): Session {
  return {
    user: { id: asId(id), role: UserRole.SALES_ADVISOR, nadraVerified: true },
  };
}

const createCaller = createCallerFactory(appRouter);

/**
 * Builds a tRPC caller for the given session against the supplied (fake)
 * database. The clock is fixed and the ledger id generator is a deterministic
 * counter, so audit rows are reproducible across runs (per `testing.mdc`,
 * injected clock/seed over wall-clock dependence). The mock verification
 * adapters resolve with zero latency to keep tests fast.
 */
export function createTestCaller(options: {
  db: PrismaClient;
  session?: Session | null;
}): ReturnType<typeof createCaller> {
  let ledgerCounter = 0;
  const ctx = createTRPCContext({
    db: options.db,
    session: options.session ?? null,
    verification: createVerificationAdapters({
      mock: { minLatencyMs: 0, maxLatencyMs: 0 },
    }),
    storage: createStorageAdapter({ now: () => FIXED_NOW }),
    now: () => FIXED_NOW,
    generateId: () => {
      ledgerCounter += 1;
      return `led_${ledgerCounter}`;
    },
  });
  return createCaller(ctx);
}
