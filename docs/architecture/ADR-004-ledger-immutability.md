# ADR-004: The audit ledger is immutable, enforced at the database

- **Status:** Accepted
- **Date:** 2026-06-28
- **Related:** `packages/domain/ledger`, `packages/database`, `database.mdc`, `security.mdc`

## Context

Sectoria handles money (escrow) and produces PLRA-compliant documentation.
Every consequential state change — a booking created, an escrow transition, a
plot allocated, a ballot run, a document issued, a commission released — is
recorded as a `LedgerEvent`. This ledger is the platform's audit trail: it is
the record we would hand to a regulator, an auditor, or a court to demonstrate
what happened and in what order.

An audit trail is only trustworthy if it is **append-only**. If a row can be
edited or deleted after the fact — whether by a buggy code path, a compromised
application credential, or a well-intentioned "data cleanup" — the trail can no
longer be relied upon, because there is no way to prove it _wasn't_ altered.

The domain layer already treats the ledger as append-only: `createLedgerEvent`
in `packages/domain/ledger` only _builds_ events; it never persists them, and
nothing in `packages/domain/*` issues an `UPDATE` or `DELETE`. But that is a
**convention** enforced by code review and discipline. Conventions fail. A
single `prisma.ledgerEvent.update(...)` slipping through review, or a manual
`DELETE` run against the production database during an incident, would silently
break the guarantee.

## Decision

Enforce ledger immutability **at the database level**, not just in application
code. A PostgreSQL trigger on the `LedgerEvent` table raises an exception on any
row-level `UPDATE` or `DELETE`, so the prohibition holds regardless of which
client (the app, a migration, a `psql` session, an ORM) attempts the write.

The trigger is installed by a dedicated Prisma migration so it travels with the
schema and is applied in every environment:

```sql
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
```

### Scope: UPDATE and DELETE only — not TRUNCATE

The trigger covers row-level `UPDATE` and `DELETE`, which are the operations an
application can realistically issue. It deliberately does **not** block
`TRUNCATE` (a table-level, owner-only operation). This is intentional: the local
seed/reset workflow (`prisma/seed.ts`) needs to wipe the table to produce a
clean demo dataset, and `TRUNCATE` is an explicit, privileged administrative act
— not something reachable through normal application code. Production database
roles used by the app should not hold `TRUNCATE` privilege.

## Consequences

- **Positive:** The append-only guarantee no longer depends on every future
  contributor remembering it. Any accidental or malicious attempt to alter
  history fails loudly with a clear, ADR-referencing error.
- **Positive:** The guarantee is uniform across access paths — ORM, raw SQL,
  admin console, or migration all hit the same wall.
- **Negative / trade-off:** A legitimate _correction_ to the ledger cannot be an
  edit. The correct pattern is a **compensating event** — a new appended row
  that records the correction — which is exactly how a real-world ledger
  (accounting, blockchain) works. Code and operators must follow this pattern
  rather than reaching for an `UPDATE`.
- **Negative / trade-off:** Resetting the table requires `TRUNCATE` (or dropping
  and re-migrating), which is slightly more friction than `DELETE` in tooling.
  Accepted, given it only affects non-production reset flows.
- **Operational note:** Because the seed relies on `TRUNCATE`, the database role
  running migrations/seeds must own the table. Application runtime roles should
  be granted `INSERT`/`SELECT` on `LedgerEvent` but not `UPDATE`/`DELETE`, so
  the trigger is a backstop rather than the only line of defence.
