import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@sectoria/database";
import { authConfig } from "./auth.config";

/**
 * Auth.js v5 — the full (Node-runtime) auth instance.
 *
 * Authentication is **phone-first, OTP-based** (auth-and-access-control.mdc):
 * Pakistani users expect to log in with a phone number and a one-time code, not
 * an email/password. The Credentials provider below verifies the OTP and then
 * resolves the user by phone.
 *
 * OTP delivery is mocked in development the same way the government adapters are
 * (verification-adapters.mdc): rather than send a real SMS, any account accepts
 * the fixed development code below. The mock is gated to non-production so a
 * real deployment fails loudly instead of silently accepting a known code — a
 * production build must wire a real OTP issue/verify step here.
 */

/** The fixed OTP accepted in development/test in place of a real SMS code. */
export const DEV_OTP_CODE = "000000";

const credentialsSchema = z.object({
  phone: z.string().min(1),
  otp: z.string().min(1),
});

/**
 * Whether `otp` is acceptable for `phone`. In production this must call the real
 * OTP verification service; until then, only the dev code is accepted and only
 * outside production.
 */
function isOtpValid(otp: string): boolean {
  if (process.env.NODE_ENV === "production") {
    // No real OTP backend is wired yet — refuse rather than accept a dev code.
    return false;
  }
  return otp === DEV_OTP_CODE;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        otp: { label: "One-time code", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { phone, otp } = parsed.data;

        if (!isOtpValid(otp)) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (user === null) return null;

        // Only identity claims travel onto the token; sensitive fields never do.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          nadraVerified: user.nadraVerified,
          societyId: user.societyId,
        };
      },
    }),
  ],
});
