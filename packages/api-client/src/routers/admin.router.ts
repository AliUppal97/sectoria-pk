import { z } from "zod";
import { VerificationTier, idSchema } from "@sectoria/types";
import { router } from "../trpc.js";
import { superAdminProcedure } from "../procedures.js";
import { toLedgerEventDto } from "../lib/serialize.js";

/**
 * Platform-admin procedures: the audit-ledger viewer, the society verification
 * queue, and a revenue/booking summary. All gated to `SUPER_ADMIN` — these are
 * cross-tenant reads, the one place a query is allowed to span every society
 * (see `auth-and-access-control.mdc` on multi-tenancy).
 */
export const adminRouter = router({
  /** Reads the append-only audit ledger, newest first, optionally filtered. */
  listLedger: superAdminProcedure
    .input(
      z
        .object({
          entityId: idSchema.optional(),
          bookingId: idSchema.optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.ledgerEvent.findMany({
        where: {
          ...(input?.entityId !== undefined
            ? { entityId: input.entityId }
            : {}),
          ...(input?.bookingId !== undefined
            ? { bookingId: input.bookingId }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
      return events.map(toLedgerEventDto);
    }),

  /** Societies still awaiting LOP/NOC verification. */
  pendingSocietyVerifications: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.society.findMany({
      where: { verificationTier: VerificationTier.PENDING },
      orderBy: { createdAt: "asc" },
    });
  }),

  /** Booking counts grouped by escrow state — the top of the revenue funnel. */
  bookingFunnel: superAdminProcedure.query(async ({ ctx }) => {
    const grouped = await ctx.db.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return grouped.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));
  }),
});
