import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * A buyer review. A review is only ever valid against a real `bookingId`
 * (no anonymous/unverified reviews), and targets exactly one subject —
 * either a user (dealer) or a society. The `.refine` enforces that
 * exactly one subject is set so trust scores can't be polluted by
 * malformed reviews.
 */
export const reviewSchema = z
  .object({
    id: idSchema,
    authorId: idSchema,
    subjectUserId: idSchema.nullable().optional(),
    subjectSocietyId: idSchema.nullable().optional(),
    bookingId: idSchema,
    rating: z.number().int().min(1).max(5),
    comment: z.string().nullable().optional(),
    createdAt: isoDateTimeSchema,
  })
  .refine(
    (review) =>
      Boolean(review.subjectUserId) !== Boolean(review.subjectSocietyId),
    {
      message:
        "A review must target exactly one subject: a user or a society, not both or neither",
    },
  );
export type Review = z.infer<typeof reviewSchema>;
