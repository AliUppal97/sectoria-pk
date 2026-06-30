import type { UserRole } from "@sectoria/types";

/**
 * Module augmentation so the Auth.js session/JWT carry Sectoria's identity
 * claims with proper types. These claims are used for *coarse* middleware
 * routing only; the authoritative role/verification state is re-read from the
 * database in the tRPC context (auth-and-access-control.mdc).
 */
declare module "next-auth" {
  interface User {
    role?: UserRole;
    nadraVerified?: boolean;
    societyId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role?: UserRole;
      nadraVerified: boolean;
      societyId?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    nadraVerified?: boolean;
    societyId?: string | null;
  }
}
