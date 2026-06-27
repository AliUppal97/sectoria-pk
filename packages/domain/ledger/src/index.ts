/**
 * `@sectoria/domain-ledger` — the append-only audit event builder.
 *
 * Pure, framework-free business logic: {@link createLedgerEvent} turns the parts
 * of an auditable state change into a fully-typed, schema-validated
 * {@link LedgerEvent}, with zero dependencies on Next.js, Prisma, or React. It
 * is the single way every other domain package records what happened.
 *
 * This package **never** writes to a database. The ledger is INSERT-only and
 * persistence — plus the Postgres trigger that forbids UPDATE/DELETE — lives in
 * the database layer (see ADR-004). The builder just returns the event for the
 * caller to insert. Invalid input throws a typed {@link InvalidLedgerEventError}
 * rather than producing a half-formed record. Import everything from this
 * barrel, not individual files.
 */
export {
  createLedgerEvent,
  type CreateLedgerEventInput,
} from "./create-ledger-event.js";
export {
  LedgerEventType,
  ledgerEventTypeSchema,
  type LedgerEvent,
} from "./event-types.js";
export { InvalidLedgerEventError } from "./errors.js";
