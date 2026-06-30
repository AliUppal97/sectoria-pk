# ADR-005: Field-level encryption and key rotation for CNIC/NTN

- **Status:** Accepted (backfilled 2026-06-30)
- **Date:** 2026-06-28
- **Related:** `packages/database/src/encryption.ts`, `security.mdc`, `.env.example`

> **Note:** This ADR documents a decision made during the initial build. It is
> backfilled here per `documentation.mdc` — the codebase already reflects it.

## Context

Sectoria stores two classes of government identifiers that must never sit in
PostgreSQL as plaintext: **CNIC** (national identity) and **NTN** (FBR tax
number). These fields are accessed only during authorized verification and
admin flows; everywhere else they are masked in the UI.

We need encryption that:

- Detects tampering (authenticated encryption).
- Supports **key rotation** without a big-bang downtime migration.
- Keeps algorithm and key handling in **one module** — no scattered `crypto` calls.

## Decision

1. **Algorithm:** AES-256-GCM via Node `crypto`, keyed from `ENCRYPTION_KEY`
   (32 random bytes, base64 or hex in env).
2. **Storage format:** Versioned self-describing strings:
   `v1:<base64(iv ‖ authTag ‖ ciphertext)>`.
3. **Scope:** Only `User.cnicEncrypted` and `User.ntnEncrypted` — no other
   columns store raw CNIC/NTN (see `database.mdc`).
4. **API:** `encrypt(plaintext)` / `decrypt(stored)` exported from
   `@sectoria/database/encryption` — the only approved path.
5. **Rotation strategy (lazy re-encrypt):**
   - Deploy new key as `ENCRYPTION_KEY_V2` (or swap env after dual-read support).
   - On read: decrypt with the version tag in the ciphertext (`v1`, future `v2`).
   - On write: always encrypt with the **current** version/key.
   - Background job or on-login hook re-encrypts stale rows over time — no
     single maintenance window required for a full table rewrite.

Operational steps for a rotation event belong in a runbook
(`docs/runbooks/rotating-encryption-keys.md` when added); this ADR records the
*why* and the versioned-format contract.

## Consequences

- **Positive:** Tamper detection via GCM auth tag; wrong key fails loudly.
- **Positive:** Version prefix makes multi-key operation explicit — no guesswork
  during rotation.
- **Negative / trade-off:** Lazy rotation means two keys must remain available
  until re-encryption completes — operational discipline required.
- **Negative / trade-off:** Search/index on CNIC/NTN plaintext is impossible by
  design; lookups use entity IDs or hashed blind indexes if needed later.
