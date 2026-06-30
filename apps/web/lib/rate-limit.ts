import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimiter } from "@sectoria/api-client";

/** Cached limiter instance — one Redis client per process. */
let cached: RateLimiter | null | undefined;

/**
 * Returns an Upstash-backed rate limiter when Redis credentials are configured,
 * otherwise `null` (guards pass through — see `packages/api-client` rate-limit
 * middleware). Wired in production per `security.mdc`.
 */
export function getRateLimiter(): RateLimiter | null {
  if (cached !== undefined) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return null;
  }

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "sectoria",
  });

  cached = {
    limit: async (identifier) => {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    },
  };
  return cached;
}

/**
 * Enforces a rate limit for non-tRPC entry points (e.g. Auth.js). Returns a 429
 * response when blocked, or `null` when the request may proceed.
 */
export async function enforceRateLimit(
  scope: string,
  clientKey: string,
): Promise<Response | null> {
  const limiter = getRateLimiter();
  if (limiter === null) return null;

  const { success } = await limiter.limit(`${scope}:${clientKey}`);
  if (!success) {
    return Response.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }
  return null;
}

/** Best-effort client IP for pre-auth rate limiting. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}
