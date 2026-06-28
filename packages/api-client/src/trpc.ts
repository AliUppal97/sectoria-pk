import { randomUUID } from "node:crypto";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { PrismaClient } from "@sectoria/database";
import type { Id, UserRole } from "@sectoria/types";
import type { VerificationAdapters } from "@sectoria/verification";

/**
 * `@sectoria/api-client` — the tRPC composition root.
 *
 * This file initialises tRPC and defines the request {@link TRPCContext}. It is
 * the *only* layer permitted to import from both `@sectoria/domain-*` and
 * `@sectoria/database` (see `api-trpc.mdc`); routes and pages call neither
 * directly, they go through the procedures composed here.
 *
 * Everything the procedures need from the outside world — the database client,
 * the government-verification adapters, an optional rate limiter, the clock, and
 * the id generator — is *injected* into the context rather than imported as a
 * concrete singleton inside a procedure. That keeps the routers testable without
 * a live database or real network and keeps the dependency direction pointing
 * inward (see `oop-and-domain-modeling.mdc`).
 */

/**
 * The slice of the authenticated session this layer trusts. It is populated
 * server-side from Auth.js (in `apps/web/auth.ts`) — never from request input.
 * Authorization is always re-derived from this, per `auth-and-access-control.mdc`.
 */
export interface SessionUser {
  readonly id: Id;
  readonly role: UserRole;
  /**
   * Whether the user has completed NADRA CNIC verification. This is a *stronger*
   * assertion than being logged in; money-moving actions gate on it explicitly
   * (see `verifiedBuyerProcedure`), not on session presence alone.
   */
  readonly nadraVerified: boolean;
  /** The society this user administers, for `SOCIETY_ADMIN`s. Null otherwise. */
  readonly societyId?: Id | null;
}

/** A successfully-authenticated session. `null` means an anonymous caller. */
export interface Session {
  readonly user: SessionUser;
}

/**
 * The result of a rate-limit check, intentionally a structural subset of what
 * `@upstash/ratelimit` returns so the concrete limiter can satisfy it directly.
 */
export interface RateLimitResult {
  readonly success: boolean;
  readonly remaining?: number;
  readonly reset?: number;
}

/**
 * Port for rate limiting. The concrete `@upstash/ratelimit` + Redis
 * implementation is injected by `apps/web`; this package depends only on the
 * abstraction so it never pulls Redis into a unit test (see `security.mdc` for
 * which endpoints must be limited, `middleware-and-guards.mdc` for placement).
 */
export interface RateLimiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

/**
 * Everything a procedure can reach. Built once per request by
 * {@link createTRPCContext}.
 */
export interface TRPCContext {
  /** The authenticated session, or `null` for an anonymous caller. */
  readonly session: Session | null;
  /** The Prisma client (or a transaction client) used for all persistence. */
  readonly db: PrismaClient;
  /** The government-verification adapters (mock in dev/test, real in prod). */
  readonly verification: VerificationAdapters;
  /** Optional rate limiter; when null, rate-limit guards pass through. */
  readonly rateLimiter: RateLimiter | null;
  /**
   * A stable per-caller key for pre-auth rate limiting (typically the client
   * IP). Post-auth limits key on the session user id instead.
   */
  readonly clientId: string | null;
  /** Injected clock — procedures never read `Date.now()` directly. */
  readonly now: () => Date;
  /** Injected id generator for ledger rows — overridable in tests. */
  readonly generateId: () => string;
}

/** Options for {@link createTRPCContext}. Only `db` and `verification` are required. */
export interface CreateTRPCContextOptions {
  readonly session?: Session | null;
  readonly db: PrismaClient;
  readonly verification: VerificationAdapters;
  readonly rateLimiter?: RateLimiter | null;
  readonly clientId?: string | null;
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

/**
 * Assembles a {@link TRPCContext} from injected capabilities, filling in the
 * clock and id generator with real defaults when not overridden.
 */
export function createTRPCContext(
  options: CreateTRPCContextOptions,
): TRPCContext {
  return {
    session: options.session ?? null,
    db: options.db,
    verification: options.verification,
    rateLimiter: options.rateLimiter ?? null,
    clientId: options.clientId ?? null,
    now: options.now ?? (() => new Date()),
    generateId: options.generateId ?? randomUUID,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  /**
   * Surface Zod validation failures in a structured `zodError` field so the
   * client can map them onto form fields, rather than only getting a flat
   * message string. See `json-and-config-conventions.mdc` on consistent error
   * shapes.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/** Build a router from a record of procedures/sub-routers. */
export const router = t.router;

/** Merge sibling routers into one. */
export const mergeRouters = t.mergeRouters;

/** Define a reusable middleware (guard). */
export const middleware = t.middleware;

/**
 * The unauthenticated base procedure. Public marketplace reads (society/dealer
 * listings) build on this; everything requiring identity layers a guard on top
 * via the named variants in `procedures.ts`.
 */
export const publicProcedure = t.procedure;

/** Factory for server-side callers (used by tests and React Server Components). */
export const createCallerFactory = t.createCallerFactory;

export { TRPCError };
