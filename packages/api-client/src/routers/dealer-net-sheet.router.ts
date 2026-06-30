import { z } from "zod";
import { idSchema, upsertDealerNetSheetInputSchema } from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { dealerProcedure, opsProcedure } from "../procedures.js";
import { resolveAuthorizedCategoryIds } from "../lib/dealer-authorization.js";

function toNetSheetDto(sheet: {
  id: string;
  dealerId: string;
  categoryId: string;
  netPricePkr: number;
  paymentPlanTerms: string | null;
  refreshedAt: Date;
  updatedAt: Date;
}) {
  return {
    id: sheet.id,
    dealerId: sheet.dealerId,
    categoryId: sheet.categoryId,
    netPricePkr: sheet.netPricePkr,
    paymentPlanTerms: sheet.paymentPlanTerms,
    refreshedAt: sheet.refreshedAt.toISOString(),
    updatedAt: sheet.updatedAt.toISOString(),
  };
}

export const dealerNetSheetRouter = router({
  upsert: dealerProcedure
    .input(upsertDealerNetSheetInputSchema)
    .mutation(async ({ ctx, input }) => {
      const dealer = await ctx.db.dealerProfile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
      if (dealer === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dealer profile not found.",
        });
      }

      const authorized = await resolveAuthorizedCategoryIds(ctx.db, dealer.id);
      if (!authorized.includes(input.categoryId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized for this category.",
        });
      }

      const now = ctx.now();
      const sheet = await ctx.db.dealerNetSheet.upsert({
        where: {
          dealerId_categoryId: {
            dealerId: dealer.id,
            categoryId: input.categoryId,
          },
        },
        create: {
          dealerId: dealer.id,
          categoryId: input.categoryId,
          netPricePkr: input.netPricePkr,
          paymentPlanTerms: input.paymentPlanTerms ?? null,
          refreshedAt: now,
        },
        update: {
          netPricePkr: input.netPricePkr,
          paymentPlanTerms: input.paymentPlanTerms ?? null,
          refreshedAt: now,
        },
      });

      return toNetSheetDto(sheet);
    }),

  listMine: dealerProcedure.query(async ({ ctx }) => {
    const dealer = await ctx.db.dealerProfile.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true },
    });
    if (dealer === null) return [];

    const sheets = await ctx.db.dealerNetSheet.findMany({
      where: { dealerId: dealer.id },
      orderBy: { updatedAt: "desc" },
    });
    return sheets.map(toNetSheetDto);
  }),

  listForCategory: opsProcedure
    .input(z.object({ categoryId: idSchema }))
    .query(async ({ ctx, input }) => {
      const sheets = await ctx.db.dealerNetSheet.findMany({
        where: { categoryId: input.categoryId },
        include: {
          dealer: { select: { id: true, agencyName: true, slug: true } },
          category: {
            select: {
              phase: true,
              block: true,
              sizeLabel: true,
              society: { select: { name: true } },
            },
          },
        },
        orderBy: { netPricePkr: "asc" },
      });

      return sheets.map((sheet) => ({
        ...toNetSheetDto(sheet),
        dealerAgencyName: sheet.dealer.agencyName,
        categoryLabel: `${sheet.category.phase} · ${sheet.category.block} · ${sheet.category.sizeLabel}`,
        societyName: sheet.category.society.name,
      }));
    }),

  getBestNet: opsProcedure
    .input(z.object({ categoryId: idSchema }))
    .query(async ({ ctx, input }) => {
      const best = await ctx.db.dealerNetSheet.findFirst({
        where: { categoryId: input.categoryId },
        orderBy: { netPricePkr: "asc" },
        include: {
          dealer: { select: { id: true, agencyName: true } },
        },
      });
      if (best === null) return null;
      return {
        ...toNetSheetDto(best),
        dealerAgencyName: best.dealer.agencyName,
      };
    }),

  listMatrix: opsProcedure.query(async ({ ctx }) => {
    const sheets = await ctx.db.dealerNetSheet.findMany({
      include: {
        dealer: { select: { agencyName: true } },
        category: {
          select: {
            phase: true,
            block: true,
            sizeLabel: true,
            societyId: true,
            pricePerSqft: true,
            sizeSqft: true,
            society: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: [{ categoryId: "asc" }, { netPricePkr: "asc" }],
    });

    const staleDays = 7;
    const staleCutoff = ctx.now().getTime() - staleDays * 24 * 60 * 60 * 1000;

    return sheets.map((sheet) => {
      const listPricePkr = Math.round(
        sheet.category.sizeSqft * Number(sheet.category.pricePerSqft),
      );
      return {
        ...toNetSheetDto(sheet),
        societyId: sheet.category.societyId,
        dealerAgencyName: sheet.dealer.agencyName,
        societyName: sheet.category.society.name,
        categoryLabel: `${sheet.category.phase} · ${sheet.category.block} · ${sheet.category.sizeLabel}`,
        listPricePkr,
        isStale: sheet.refreshedAt.getTime() < staleCutoff,
      };
    });
  }),
});
