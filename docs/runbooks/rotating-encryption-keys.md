# Runbook: Rotating the CNIC/NTN encryption key

Field-level encryption for `User.cnicEncrypted` / `User.ntnEncrypted` lives in
`packages/database/src/encryption.ts` (AES-256-GCM). The strategy is **lazy
re-encrypt** — no big-bang table rewrite. See ADR-005 for the decision record;
this runbook is the operator procedure.

> **Prerequisite:** As of the `v1` helper, `encrypt` / `decrypt` read only
> `ENCRYPTION_KEY` and accept only the `v1:` ciphertext prefix. A live rotation
> that keeps old rows readable requires **dual-read support** in that module
> (`ENCRYPTION_KEY` + `ENCRYPTION_KEY_V2`, and decrypt branches for `v1` / `v2`)
> before you start Step 2. Do not swap `ENCRYPTION_KEY` alone in production while
> any `v1:` rows remain — decryption will fail auth and throw `EncryptionError`.

## Ciphertext contract

Stored values are versioned, self-describing strings (safe for a Prisma
`String?` column):

```text
v1:<base64(iv ‖ authTag ‖ ciphertext)>
```

| Piece | Size | Notes |
|---|---|---|
| Version prefix | `v1` (future: `v2`) | Separated from the payload by `:` |
| IV | 12 bytes | Random per encrypt call (GCM standard nonce) |
| Auth tag | 16 bytes | GCM authenticity check |
| Ciphertext | variable | UTF-8 plaintext of CNIC or NTN |

`encrypt` always writes with the **current** version/key. `decrypt` selects the
key by the version tag in the token. `isEncrypted` only checks envelope shape
(`v1:` today) — it does **not** prove the key is correct.

Env encoding for keys: 32 random bytes as **base64** (preferred,
`openssl rand -base64 32`) or a **64-character hex** string. Same rules as
`.env.example` / `packages/database/README.md`.

## 1. Generate the new key (offline)

1. Generate a new 32-byte key; never reuse a previous production key:
   ```bash
   openssl rand -base64 32
   ```
2. Store it in your secret manager as the **next** key
   (`ENCRYPTION_KEY_V2` during the dual-key period). Do not commit it.
3. Keep the existing production `ENCRYPTION_KEY` (the key that produced all
   current `v1:` rows) available and unchanged until re-encryption completes.

## 2. Dual-key period — deploy order

Deploy **code that can decrypt both versions before** you start writing `v2:`
rows. Order matters:

| Order | Action | Why |
|---|---|---|
| 1 | Ship dual-read `encryption.ts` (decrypt `v1` with `ENCRYPTION_KEY`, decrypt `v2` with `ENCRYPTION_KEY_V2`; encrypt still `v1` / current key) | Old rows stay readable |
| 2 | Set `ENCRYPTION_KEY_V2` in the environment (same encoding rules as `ENCRYPTION_KEY`) and redeploy | New key present but not yet used for writes |
| 3 | Smoke-test decrypt of known `v1:` fixtures in a non-production env that mirrors prod keys | Confirms dual-read wiring |
| 4 | Flip write path so `encrypt` emits `v2:` under `ENCRYPTION_KEY_V2` (current version = `v2`) and redeploy | New writes use the new key; old `v1:` rows still decrypt |
| 5 | Run lazy re-encrypt (Step 4) until no `v1:` rows remain | Dual-key window shrinks |
| 6 | Remove `ENCRYPTION_KEY` (old key), drop `v1` decrypt branch if desired, promote `ENCRYPTION_KEY_V2` → `ENCRYPTION_KEY` (and clear `_V2`) per your secret naming convention | End dual-key period |

Never reverse steps 1–4 (e.g. writing `v2:` before dual-read is live, or
replacing `ENCRYPTION_KEY` before `v1:` rows are gone).

## 3. Verify decrypt with `v1` / `v2` tags

In a staging environment with both keys set:

1. Confirm a known row (or fixture) still starts with `v1:` and
   `decrypt(token)` returns the expected plaintext under the **old** key path.
2. Encrypt a test value after the write flip; confirm the token starts with
   `v2:` and decrypts under the **new** key path.
3. Confirm a deliberately wrong key or truncated token throws `EncryptionError`
   (auth failure / malformed) without logging plaintext, key material, or raw
   ciphertext — see `security.mdc`.
4. Spot-check production only via authorized admin/verification flows that
   already decrypt; never dump CNIC/NTN into logs or ad-hoc scripts that print
   plaintext.

SQL shape check only (no plaintext):

```sql
-- Count rows still on the old envelope (adjust schema/table as needed)
SELECT
  COUNT(*) FILTER (WHERE "cnicEncrypted" LIKE 'v1:%') AS cnic_v1,
  COUNT(*) FILTER (WHERE "cnicEncrypted" LIKE 'v2:%') AS cnic_v2,
  COUNT(*) FILTER (WHERE "ntnEncrypted" LIKE 'v1:%') AS ntn_v1,
  COUNT(*) FILTER (WHERE "ntnEncrypted" LIKE 'v2:%') AS ntn_v2
FROM "User"
WHERE "cnicEncrypted" IS NOT NULL OR "ntnEncrypted" IS NOT NULL;
```

## 4. Lazy re-encrypt (on-login or batch)

Until every non-null `cnicEncrypted` / `ntnEncrypted` is `v2:`, keep both keys
deployed.

**On-login (or on any authorized read that already decrypts):**

1. `decrypt` the stored token (version tag selects the key).
2. If the version is stale (`v1` while current write version is `v2`),
   `encrypt` again and persist the new token in the same transaction/update as
   the rest of the flow.
3. Never write plaintext CNIC/NTN; never log the value.

**Batch job (optional accelerator):**

1. Page through users with `cnicEncrypted` / `ntnEncrypted` matching `v1:%`.
2. For each row: decrypt → encrypt → update. Bound concurrency; treat
   `EncryptionError` as a hard stop for that row (investigate key/env mismatch
   before continuing).
3. Re-run the Step 3 SQL counts until `*_v1` is zero.
4. Prefer a maintenance window only for the *final* old-key removal — not for
   the re-encrypt itself.

## 5. Rollback

| Situation | Action |
|---|---|
| Dual-read deploy fails smoke tests | Revert the app deploy; leave env keys unchanged. No data migration to undo. |
| Write flip to `v2` causes errors | Redeploy previous app version that still writes `v1:` **while both keys remain set**. Existing `v2:` rows (if any) need the dual-read build to stay decryptable — do not remove `ENCRYPTION_KEY_V2`. |
| Re-encrypt job fails mid-run | Stop the job. Dual-key period continues; `v1:` and `v2:` rows coexist by design. Fix the failure, resume. |
| Need to abandon the new key before any `v2:` writes | Unset `ENCRYPTION_KEY_V2`, keep `ENCRYPTION_KEY`, redeploy write path still on `v1`. |

After old-key removal, rollback to decrypting `v1:` is **not** possible without
restoring the old key from the secret manager. Retain that secret offline until
you are certain no backups or replicas still hold `v1:` ciphertext you may need
to read.

## 6. Checklist before closing a rotation

- [ ] Dual-read code shipped and smoke-tested before any `v2:` writes
- [ ] `ENCRYPTION_KEY` (old) and `ENCRYPTION_KEY_V2` (new) both set during the dual-key window
- [ ] New writes produce `v2:<base64(iv ‖ authTag ‖ ciphertext)>`
- [ ] On-login and/or batch re-encrypt drove `v1:` counts to zero
- [ ] Old key removed from runtime env only after that; secret retained offline per retention policy
- [ ] No CNIC/NTN plaintext in logs, metrics, or committed fixtures
