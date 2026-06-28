import { Prisma } from "@sectoria/database";
import type { LedgerEvent } from "@sectoria/types";

/**
 * Inserts a domain {@link LedgerEvent} as an append-only audit row.
 *
 * The ledger is INSERT-only — the Postgres trigger from ADR-004 blocks
 * UPDATE/DELETE at the database level — so this is deliberately the *only* write
 * path callers use. It takes a transaction client so the event commits in the
 * same `$transaction` as the state change it describes; an audit row and the
 * mutation it records must never be able to diverge (see `api-trpc.mdc`).
 *
 * @param tx - The active Prisma transaction client.
 * @param event - A built, validated ledger event from `@sectoria/domain-ledger`.
 */
export async function persistLedgerEvent(
  tx: Prisma.TransactionClient,
  event: LedgerEvent,
): Promise<void> {
  await tx.ledgerEvent.create({
    data: {
      id: event.id,
      type: event.type,
      entityId: event.entityId,
      bookingId: event.bookingId ?? null,
      payload: event.payload as Prisma.InputJsonValue,
      actorId: event.actorId ?? null,
      actorRole: event.actorRole ?? null,
      createdAt: new Date(event.createdAt),
    },
  });
}
