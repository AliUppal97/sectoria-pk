# @sectoria/database

The **persistence layer**: the Prisma schema, the shared Prisma client
singleton, the generated model/enum types, and the AES-256-GCM field-level
encryption helper for CNIC/NTN.

## What it does

- Exposes a single shared `prisma` client (connection-pool–safe across Next.js
  hot reloads — see `src/client.ts`).
- Re-exports the generated Prisma model and enum types so the rest of the
  monorepo imports persistence types from here, not from `@prisma/client`.
- Provides `encrypt` / `decrypt` for the two PII fields that must never be
  stored in plaintext: `User.cnicEncrypted` and `User.ntnEncrypted`.

## What it deliberately does NOT do

- **No business logic.** Tax, escrow, allocation, balloting, trust-score and
  ledger rules live in `packages/domain/*` as pure functions. This package is
  the _caller_ that persists what those functions return. `packages/domain/*`
  never imports Prisma.
- **It does not let you mutate the audit ledger.** `LedgerEvent` is
  append-only; a Postgres trigger (installed by migration, see
  [ADR-004](../../docs/architecture/ADR-004-ledger-immutability.md)) rejects
  `UPDATE` and `DELETE` at the database level.

## Usage

```ts
import { prisma } from "@sectoria/database";
import { encrypt, decrypt } from "@sectoria/database/encryption";

// Store a buyer with an encrypted CNIC (never the raw value):
const user = await prisma.user.create({
  data: {
    name: "Aisha Khan",
    phone: "+923001234567",
    cnicEncrypted: encrypt("35202-1234567-1"),
  },
});

// Read it back only where authorized:
const cnic = user.cnicEncrypted ? decrypt(user.cnicEncrypted) : null;
```

## Environment

Two variables are required (see `.env.example`; real values live in the root
`.env`, symlinked here as `.env` so the Prisma CLI finds them):

| Variable         | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string.                                    |
| `ENCRYPTION_KEY` | 32 random bytes (base64 or 64-char hex) for AES-256-GCM. Rotate per ADR-005. |

Generate a key with `openssl rand -base64 32`.

## Common commands

```bash
# Create + apply a migration and regenerate the client
pnpm --filter @sectoria/database exec prisma migrate dev --name <name>

# Regenerate the typed client only
pnpm --filter @sectoria/database exec prisma generate

# Reset to a clean, realistic demo dataset (idempotent — TRUNCATEs first)
pnpm --filter @sectoria/database seed

# Browse the data
pnpm --filter @sectoria/database exec prisma studio

# Encryption round-trip tests
pnpm --filter @sectoria/database test
```

## Seed data

`prisma/seed.ts` generates a realistic Pakistani-context dataset: 5 societies
(Lahore / Islamabad / Karachi), 4–6 inventory categories each with payment
plans and plots, 9 dealers (some DNFBP-verified), 18 buyers with varied ATL
statuses, and bookings spanning **every** escrow state. Bookings are driven
through the escrow state machine (`@sectoria/domain-escrow`) and every audit
row is built by the domain ledger builder (`@sectoria/domain-ledger`) — the
seed exercises the same code path production uses. **Reviews are attached only
to bookings that reached `COMMISSION_RELEASED`.**
