-- Enforce ledger immutability at the database level (see ADR-004).
--
-- The audit ledger is append-only: it is the record we would hand to a
-- regulator or auditor. Application code already avoids mutating it, but that
-- is a convention. This trigger makes the guarantee unconditional — any
-- row-level UPDATE or DELETE on "LedgerEvent", from any client (ORM, raw SQL,
-- psql, a migration), fails loudly. Corrections are made by appending a
-- compensating event, never by editing history.
--
-- Scope is UPDATE/DELETE only, NOT TRUNCATE: TRUNCATE is a privileged,
-- owner-only table-level operation used by the local seed/reset flow and is
-- not reachable from normal application code (see ADR-004).

CREATE OR REPLACE FUNCTION reject_ledger_event_mutation()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'LedgerEvent is append-only: % is not permitted (see ADR-004).',
    TG_OP;
END;
$$;

CREATE TRIGGER ledger_event_no_update
  BEFORE UPDATE ON "LedgerEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_event_mutation();

CREATE TRIGGER ledger_event_no_delete
  BEFORE DELETE ON "LedgerEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_ledger_event_mutation();
