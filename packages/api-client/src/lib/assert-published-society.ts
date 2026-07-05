import { SocietyPublishStatus } from "@sectoria/types";
import type { PrismaClient } from "@sectoria/database";
import { TRPCError } from "../trpc.js";

type DbClient = Pick<PrismaClient, "society">;

/**
 * Public profile reads must only surface `PUBLISHED` societies (foundations.md §1.1).
 * Draft/archived societies are indistinguishable from missing for public callers —
 * same semantics as `society.getBySlug`.
 */
export async function assertPublishedSociety(
  db: DbClient,
  societyId: string,
): Promise<void> {
  const society = await db.society.findUnique({
    where: { id: societyId },
    select: { publishStatus: true },
  });
  if (
    society === null ||
    society.publishStatus !== SocietyPublishStatus.PUBLISHED
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Society not found.",
    });
  }
}
