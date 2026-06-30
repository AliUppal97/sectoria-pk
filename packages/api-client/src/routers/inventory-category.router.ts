import { z } from "zod";
import {
  allocationStrategySchema,
  decimalStringSchema,
  idSchema,
  installmentIntervalSchema,
  plotTypeSchema,
  slugSchema,
} from "@sectoria/types";
import type { InventoryCategory as CategoryRow } from "@sectoria/database";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";

/**
 * Inventory-category procedures: a society's sellable buckets (phase/block/size)
 * with their pricing and availability. Reads are public; create/update are
 * restricted to the owning society's administrator.
 *
 * `pricePerSqft` is a `Decimal` at the database level — it is converted to and
 * from a decimal *string* at this boundary so exact pricing precision survives
 * the wire (a JSON float would silently lose it; see `json-and-config-conventions.mdc`).
 */
function toCategoryDto(row: CategoryRow) {
  return { ...row, pricePerSqft: row.pricePerSqft.toString() };
}

function toPaymentPlanDto(plan: {
  downPaymentPct: { toString(): string };
  [key: string]: unknown;
}) {
  return {
    ...plan,
    downPaymentPct: plan.downPaymentPct.toString(),
  };
}

async function assertCategoryOwnership(
  db: { inventoryCategory: { findUnique: (args: { where: { id: string }; select: { societyId: true } }) => Promise<{ societyId: string } | null> } },
  categoryId: string,
  session: Parameters<typeof assertSocietyOwnership>[0],
): Promise<void> {
  const category = await db.inventoryCategory.findUnique({
    where: { id: categoryId },
    select: { societyId: true },
  });
  if (category === null) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Inventory category not found.",
    });
  }
  assertSocietyOwnership(session, category.societyId);
}

export const inventoryCategoryRouter = router({
  /** Public: all categories for a society. */
  listBySociety: publicProcedure
    .input(z.object({ societyId: idSchema }))
    .query(async ({ ctx, input }) => {
      const categories = await ctx.db.inventoryCategory.findMany({
        where: { societyId: input.societyId },
        orderBy: [{ phase: "asc" }, { block: "asc" }],
      });
      return categories.map(toCategoryDto);
    }),

  /** Public: one category with its payment plans. */
  getById: publicProcedure
    .input(z.object({ categoryId: idSchema }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.inventoryCategory.findUnique({
        where: { id: input.categoryId },
        include: { paymentPlans: true },
      });
      if (category === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inventory category not found.",
        });
      }
      return {
        ...toCategoryDto(category),
        paymentPlans: category.paymentPlans.map((plan) => ({
          ...plan,
          downPaymentPct: plan.downPaymentPct.toString(),
        })),
      };
    }),

  /** Creates a category under a society. Restricted to that society's admin. */
  create: societyAdminProcedure
    .input(
      z.object({
        societyId: idSchema,
        slug: slugSchema,
        phase: z.string().min(1),
        block: z.string().min(1),
        plotType: plotTypeSchema,
        sizeLabel: z.string().min(1),
        sizeSqft: z.number().int().positive(),
        pricePerSqft: decimalStringSchema,
        totalUnits: z.number().int().nonnegative(),
        allocationStrategy: allocationStrategySchema,
        fbrValuationZone: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.inventoryCategory.create({
        data: {
          societyId: input.societyId,
          slug: input.slug,
          phase: input.phase,
          block: input.block,
          plotType: input.plotType,
          sizeLabel: input.sizeLabel,
          sizeSqft: input.sizeSqft,
          pricePerSqft: input.pricePerSqft,
          totalUnits: input.totalUnits,
          // New inventory starts fully available.
          availableUnits: input.totalUnits,
          allocationStrategy: input.allocationStrategy,
          fbrValuationZone: input.fbrValuationZone,
        },
      });
      return toCategoryDto(created);
    }),

  /** Updates pricing / availability fields. Restricted to the owning admin. */
  update: societyAdminProcedure
    .input(
      z.object({
        categoryId: idSchema,
        data: z.object({
          pricePerSqft: decimalStringSchema.optional(),
          totalUnits: z.number().int().nonnegative().optional(),
          availableUnits: z.number().int().nonnegative().optional(),
          allocationStrategy: allocationStrategySchema.optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.inventoryCategory.findUnique({
        where: { id: input.categoryId },
        select: { societyId: true },
      });
      if (category === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Inventory category not found.",
        });
      }
      assertSocietyOwnership(ctx.session, category.societyId);

      const updated = await ctx.db.inventoryCategory.update({
        where: { id: input.categoryId },
        data: input.data,
      });
      return toCategoryDto(updated);
    }),

  createPaymentPlan: societyAdminProcedure
    .input(
      z.object({
        categoryId: idSchema,
        label: z.string().min(1),
        downPaymentPct: decimalStringSchema,
        installmentCount: z.number().int().nonnegative(),
        installmentInterval: installmentIntervalSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCategoryOwnership(ctx.db, input.categoryId, ctx.session);
      const created = await ctx.db.paymentPlan.create({
        data: {
          categoryId: input.categoryId,
          label: input.label,
          downPaymentPct: input.downPaymentPct,
          installmentCount: input.installmentCount,
          installmentInterval: input.installmentInterval,
        },
      });
      return toPaymentPlanDto(created);
    }),

  updatePaymentPlan: societyAdminProcedure
    .input(
      z.object({
        paymentPlanId: idSchema,
        data: z.object({
          label: z.string().min(1).optional(),
          downPaymentPct: decimalStringSchema.optional(),
          installmentCount: z.number().int().nonnegative().optional(),
          installmentInterval: installmentIntervalSchema.optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.paymentPlan.findUnique({
        where: { id: input.paymentPlanId },
        select: { categoryId: true },
      });
      if (plan === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment plan not found.",
        });
      }
      await assertCategoryOwnership(ctx.db, plan.categoryId, ctx.session);
      const updated = await ctx.db.paymentPlan.update({
        where: { id: input.paymentPlanId },
        data: input.data,
      });
      return toPaymentPlanDto(updated);
    }),

  deletePaymentPlan: societyAdminProcedure
    .input(z.object({ paymentPlanId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.paymentPlan.findUnique({
        where: { id: input.paymentPlanId },
        select: { categoryId: true },
      });
      if (plan === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment plan not found.",
        });
      }
      await assertCategoryOwnership(ctx.db, plan.categoryId, ctx.session);
      await ctx.db.paymentPlan.delete({ where: { id: input.paymentPlanId } });
      return { ok: true as const };
    }),
});
