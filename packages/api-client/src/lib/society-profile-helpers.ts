import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@sectoria/database";
import type { Session } from "../trpc.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";

type DbClient = Pick<
  PrismaClient,
  | "societyMedia"
  | "societyDocument"
  | "amenityFeature"
  | "societyHighlight"
  | "nearbyLandmark"
  | "societyMilestone"
>;

/** Applies ordered ids as sortOrder 0..n-1 within a society-owned collection. */
export async function applyReorder(
  db: DbClient,
  model: keyof DbClient,
  societyId: string,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) => {
      const delegate = db[model] as unknown as {
        update: (args: {
          where: { id: string };
          data: { sortOrder: number };
        }) => Promise<unknown>;
      };
      return delegate.update({
        where: { id },
        data: { sortOrder: index },
      });
    }),
  );
  void societyId;
}

/** Resolves the owning societyId for a resource row, or null when missing. */
export async function findResourceSocietyId(
  delegate: {
    findUnique(args: {
      where: { id: string };
      select: { societyId: true };
    }): Promise<{ societyId: string } | null>;
  },
  resourceId: string,
): Promise<string | null> {
  const row = await delegate.findUnique({
    where: { id: resourceId },
    select: { societyId: true },
  });
  return row?.societyId ?? null;
}

/** Loads a society-owned row by id; asserts ownership; throws NOT_FOUND when missing. */
export async function loadOwnedSocietyResource(
  findSocietyId: (resourceId: string) => Promise<string | null>,
  resourceId: string,
  session: Session,
  resourceLabel: string,
): Promise<void> {
  const societyId = await findSocietyId(resourceId);
  if (societyId === null) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `${resourceLabel} not found.`,
    });
  }
  assertSocietyOwnership(session, societyId);
}
