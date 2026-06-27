/**
 * The ledger's event vocabulary. The canonical definition lives in
 * `@sectoria/types` (it is a shared contract persisted by the database layer and
 * read by the ledger viewer), so this package does not redefine it — it
 * re-exports it. That gives a caller a single import surface: the builder and
 * the event-type constants it accepts come from the same package.
 *
 * Adding a new auditable action is a one-line change in `@sectoria/types`; it
 * then flows through here automatically with no edit required.
 */
export {
  LedgerEventType,
  ledgerEventTypeSchema,
  type LedgerEvent,
} from "@sectoria/types";
