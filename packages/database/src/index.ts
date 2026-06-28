/**
 * `@sectoria/database` — the persistence layer: the Prisma client singleton,
 * generated model/enum types, and the CNIC/NTN field-level encryption helper.
 *
 * This package owns *how data is stored*. Business rules do not live here — pure
 * domain logic stays in `packages/domain/*`, which never imports Prisma. This
 * layer is the caller that takes the events those pure functions return (e.g. a
 * `LedgerEvent` from `@sectoria/domain-ledger`) and performs the actual INSERT.
 *
 * The audit ledger is append-only: a Postgres trigger (installed by migration,
 * see ADR-004) rejects UPDATE/DELETE on `LedgerEvent` at the database level, so
 * the immutability guarantee does not depend on application discipline alone.
 *
 * Import the client and types from this barrel; import the encryption helper
 * from `@sectoria/database/encryption`.
 */
export { prisma } from "./client.js";
export {
  EncryptionError,
  encrypt,
  decrypt,
  isEncrypted,
} from "./encryption.js";

// Re-export the generated Prisma namespace so consumers get model + enum types
// (User, Booking, EscrowState, Prisma.JsonValue, …) without depending on
// `@prisma/client` directly. Keeps `@sectoria/database` the single import
// surface for the persistence layer.
export { Prisma, PrismaClient } from "@prisma/client";
export type {
  User,
  Society,
  InventoryCategory,
  PaymentPlan,
  Plot,
  Booking,
  DealerProfile,
  SocietyPartnerAuthorization,
  Review,
  LedgerEvent,
  UserRole,
  AtlStatus,
  VerificationTier,
  PlotType,
  AllocationStrategy,
  PlotStatus,
  EscrowState,
  AuthorizationStatus,
} from "@prisma/client";
