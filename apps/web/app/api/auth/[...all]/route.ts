import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";

/**
 * Auth.js v5 route handler. The single `handlers` export (GET/POST) replaces the
 * v4 `[...nextauth]` options-object pattern — see auth.ts for the config.
 *
 * Rate-limited per client IP before any credential/OTP processing (security.mdc).
 */
async function rateLimited(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>,
): Promise<Response> {
  const blocked = await enforceRateLimit("auth", clientIp(req));
  if (blocked !== null) return blocked;
  return handler(req);
}

export function GET(req: NextRequest): Promise<Response> {
  return rateLimited(req, handlers.GET);
}

export function POST(req: NextRequest): Promise<Response> {
  return rateLimited(req, handlers.POST);
}
