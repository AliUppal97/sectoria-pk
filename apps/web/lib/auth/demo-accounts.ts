import "server-only";
import { prisma } from "@sectoria/database";
import { UserRole, type AtlStatus as AtlStatusType } from "@sectoria/types";

/**
 * A seeded buyer account surfaced on the login screen for local demos, so a
 * reviewer can sign in without knowing the generated phone numbers. Gated to
 * non-production: a real deployment never lists accounts.
 */
export interface DemoAccount {
  readonly name: string;
  readonly phone: string;
  readonly nadraVerified: boolean;
  readonly atlStatus: AtlStatusType;
}

/**
 * Lists a handful of seeded BUYER accounts for the dev login picker. Returns an
 * empty list in production. Surfaces a mix of NADRA-verified and not-yet-verified
 * buyers so the full wizard (including the NADRA step) can be walked end to end.
 */
export async function listDemoBuyers(): Promise<DemoAccount[]> {
  if (process.env.NODE_ENV === "production") return [];

  const users = await prisma.user.findMany({
    where: { role: UserRole.BUYER },
    orderBy: { phone: "asc" },
    take: 8,
    select: { name: true, phone: true, nadraVerified: true, atlStatus: true },
  });

  return users;
}
