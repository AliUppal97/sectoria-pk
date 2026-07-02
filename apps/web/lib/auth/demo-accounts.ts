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

/** True when demo/E2E fixtures should be available (never in real production). */
function allowDemoFixtures(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.E2E_TEST === "1";
}

/**
 * Lists a handful of seeded BUYER accounts for the dev login picker. Returns an
 * empty list in production. Surfaces a mix of NADRA-verified and not-yet-verified
 * buyers so the full wizard (including the NADRA step) can be walked end to end.
 */
export async function listDemoBuyers(): Promise<DemoAccount[]> {
  if (!allowDemoFixtures()) return [];

  const users = await prisma.user.findMany({
    where: { role: UserRole.BUYER },
    orderBy: { phone: "asc" },
    take: 8,
    select: { name: true, phone: true, nadraVerified: true, atlStatus: true },
  });

  return users;
}

/** Seeded dealer-partner accounts for the dev login picker. */
export async function listDemoDealers(): Promise<DemoAccount[]> {
  if (!allowDemoFixtures()) return [];

  const users = await prisma.user.findMany({
    where: { role: UserRole.DEALER_PARTNER },
    orderBy: { phone: "asc" },
    take: 5,
    select: {
      name: true,
      phone: true,
      nadraVerified: true,
      atlStatus: true,
      dealerProfile: { select: { agencyName: true, dnfbpVerified: true } },
    },
  });

  return users.map((user) => ({
    name: user.dealerProfile?.agencyName
      ? `${user.dealerProfile.agencyName}`
      : user.name,
    phone: user.phone,
    nadraVerified: user.nadraVerified,
    atlStatus: user.atlStatus,
  }));
}

/** Seeded sales-advisor accounts for the dev login picker. */
export async function listDemoSalesAdvisors(): Promise<DemoAccount[]> {
  if (!allowDemoFixtures()) return [];

  const users = await prisma.user.findMany({
    where: { role: UserRole.SALES_ADVISOR },
    orderBy: { phone: "asc" },
    take: 3,
    select: { name: true, phone: true, nadraVerified: true, atlStatus: true },
  });

  return users;
}

/** Seeded platform-admin accounts for the dev login picker. */
export async function listDemoSuperAdmins(): Promise<DemoAccount[]> {
  if (!allowDemoFixtures()) return [];

  const users = await prisma.user.findMany({
    where: { role: UserRole.SUPER_ADMIN },
    orderBy: { phone: "asc" },
    take: 3,
    select: { name: true, phone: true, nadraVerified: true, atlStatus: true },
  });

  return users.map((user) => ({
    name: `${user.name} (platform admin)`,
    phone: user.phone,
    nadraVerified: user.nadraVerified,
    atlStatus: user.atlStatus,
  }));
}

/** Seeded society-admin accounts for the dev login picker. */
export async function listDemoSocietyAdmins(): Promise<DemoAccount[]> {
  if (!allowDemoFixtures()) return [];

  const users = await prisma.user.findMany({
    where: { role: UserRole.SOCIETY_ADMIN },
    orderBy: { phone: "asc" },
    take: 5,
    select: {
      name: true,
      phone: true,
      nadraVerified: true,
      atlStatus: true,
      society: { select: { name: true } },
    },
  });

  return users.map((user) => ({
    name: user.society?.name
      ? `${user.name} (${user.society.name})`
      : user.name,
    phone: user.phone,
    nadraVerified: user.nadraVerified,
    atlStatus: user.atlStatus,
  }));
}
