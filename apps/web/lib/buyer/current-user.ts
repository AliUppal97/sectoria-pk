import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@sectoria/database";
import type { AtlStatus as AtlStatusType, UserRole } from "@sectoria/types";
import { auth } from "@/auth";

/**
 * The authenticated buyer's profile fields the portal needs to render — read
 * fresh from the database, never from the (possibly stale) JWT. Raw CNIC/NTN are
 * deliberately *not* included: only ciphertext exists at rest and it is never
 * decrypted for display (security.mdc), so the portal shows a "stored/verified"
 * indicator rather than any digits.
 */
export interface CurrentBuyer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: UserRole;
  readonly atlStatus: AtlStatusType;
  readonly atlVerifiedAt: Date | null;
  readonly nadraVerified: boolean;
  /** Whether an encrypted CNIC is on file (verification has been completed). */
  readonly hasCnicOnFile: boolean;
  readonly createdAt: Date;
}

/**
 * Resolves the current buyer or redirects to login. Use in buyer Server
 * Components that need profile data beyond what the session token carries.
 */
export async function getCurrentBuyer(): Promise<CurrentBuyer> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      atlStatus: true,
      atlVerifiedAt: true,
      nadraVerified: true,
      cnicEncrypted: true,
      createdAt: true,
    },
  });
  if (user === null) {
    redirect("/login");
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    atlStatus: user.atlStatus,
    atlVerifiedAt: user.atlVerifiedAt,
    nadraVerified: user.nadraVerified,
    hasCnicOnFile: user.cnicEncrypted !== null,
    createdAt: user.createdAt,
  };
}
