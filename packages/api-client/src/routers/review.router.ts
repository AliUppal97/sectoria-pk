import { z } from "zod";
import { EscrowState, LedgerEventType, idSchema } from "@sectoria/types";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { router, TRPCError } from "../trpc.js";
import { protectedProcedure, publicProcedure } from "../procedures.js";
import { mapDomainError } from "../lib/map-domain-error.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { toId } from "../lib/ids.js";

/**
 * Review procedures. A review is only ever valid against a real booking the
 * author made (no anonymous/unverified reviews — the anti-gaming anchor) and
 * must target exactly one subject: the dealer on the booking or the booking's
 * society. The subject is cross-checked against the booking so a review can't be
 * pointed at an unrelated profile to pollute its trust score.
 */

/** Escrow states from which a transaction is "complete enough" to review. */
const REVIEWABLE_STATES: readonly EscrowState[] = [
  EscrowState.FULLY_PAID,
  EscrowState.DOCUMENTS_ISSUED,
  EscrowState.COMMISSION_RELEASED,
];

export const reviewRouter = router({
  /** Public: all reviews for a society, newest first. */
  listForSociety: publicProcedure
    .input(z.object({ societyId: idSchema }))
    .query(async ({ ctx, input }) => {
      return ctx.db.review.findMany({
        where: { subjectSocietyId: input.societyId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Submits a review tied to one of the caller's own completed bookings. Records
   * a `REVIEW_SUBMITTED` audit event in the same transaction as the review.
   */
  submit: protectedProcedure
    .input(
      z
        .object({
          bookingId: idSchema,
          rating: z.number().int().min(1).max(5),
          comment: z.string().min(1).optional(),
          subjectUserId: idSchema.optional(),
          subjectSocietyId: idSchema.optional(),
        })
        .refine(
          (review) =>
            Boolean(review.subjectUserId) !== Boolean(review.subjectSocietyId),
          {
            message:
              "A review must target exactly one subject: a dealer or a society.",
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const booking = await ctx.db.booking.findUnique({
          where: { id: input.bookingId },
          include: {
            category: { select: { societyId: true } },
            dealer: { select: { userId: true } },
          },
        });
        if (booking === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found.",
          });
        }
        if (booking.buyerId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only review your own bookings.",
          });
        }
        if (!REVIEWABLE_STATES.includes(booking.status)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This booking is not far enough along to review yet.",
          });
        }

        // The subject must actually be a party to this booking.
        if (
          input.subjectSocietyId !== undefined &&
          input.subjectSocietyId !== booking.category.societyId
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That society is not associated with this booking.",
          });
        }
        if (
          input.subjectUserId !== undefined &&
          input.subjectUserId !== booking.dealer?.userId
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That dealer is not associated with this booking.",
          });
        }

        const subjectId = input.subjectSocietyId ?? input.subjectUserId;

        return await ctx.db.$transaction(async (tx) => {
          const review = await tx.review.create({
            data: {
              authorId: ctx.session.user.id,
              bookingId: booking.id,
              rating: input.rating,
              comment: input.comment ?? null,
              subjectUserId: input.subjectUserId ?? null,
              subjectSocietyId: input.subjectSocietyId ?? null,
            },
          });

          const event = createLedgerEvent({
            id: toId(ctx.generateId()),
            type: LedgerEventType.REVIEW_SUBMITTED,
            entityId: toId(subjectId as string),
            bookingId: toId(booking.id),
            payload: { rating: input.rating, reviewId: review.id },
            actor: {
              actorId: ctx.session.user.id,
              actorRole: ctx.session.user.role,
            },
            createdAt: ctx.now().toISOString(),
          });
          await persistLedgerEvent(tx, event);

          return review;
        });
      } catch (error) {
        throw mapDomainError(error);
      }
    }),
});
