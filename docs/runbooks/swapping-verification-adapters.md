# Runbook: Swapping a Mock Verification Adapter for Production

`packages/verification` ships every government integration as an
**interface + mock + real** triple, selected by a single factory
(`createVerificationAdapters`). This runbook describes exactly what to do to move
one integration from mock to a live API, and the contract a real adapter must
satisfy.

> Scope discipline: implementing a real adapter touches **only** that adapter's
> `real-adapter.ts` and (if a new env var is needed) the factory's branching in
> `config.ts`. If you find yourself needing to change the interface, the
> interface was wrong — fix the interface and update the mock to match, don't
> special-case around it. See `verification-adapters.mdc`.

## 1. Environment variables

The factory reads these from `process.env` (override via the `env` option). An
adapter goes **real** only when *both* its URL and key are set; both blank →
**mock**; exactly one set → `VerificationConfigError` (fail loudly, never a
silent fallback).

| Integration | URL var | Key var |
|---|---|---|
| NADRA | `NADRA_API_URL` | `NADRA_API_KEY` |
| FBR ATL | `FBR_ATL_API_URL` | `FBR_ATL_API_KEY` |
| DNFBP | `DNFBP_API_URL` | `DNFBP_API_KEY` |
| PLRA | `PLRA_API_URL` | `PLRA_API_KEY` |

Add any new variable to `.env.example` (placeholder only — never a real secret)
and to the boot-time env schema in `packages/config/env.ts` when that exists, so
the app fails fast on a missing/malformed secret. See `security.mdc` and
`json-and-config-conventions.mdc`.

## 2. Implement the real adapter

Each `Real*Adapter` is constructed with `{ baseUrl, apiKey }` and currently
throws `VerificationAdapterNotImplementedError`. Replace the body so it:

1. **Calls the live API** using the injected `baseUrl`/`apiKey` (and a request
   timeout).
2. **Normalises the response to camelCase inside the adapter.** Government APIs
   often return `snake_case`; convert immediately so no `snake_case` leaks into
   the rest of the codebase.
3. **Parses the normalised object** against the matching Zod schema from
   `@sectoria/types` (`nadraVerificationResultSchema`, `atlStatusResultSchema`,
   `dnfbpVerificationResultSchema`, `plraCertificateSchema`) and returns the
   parsed value — never untyped property access.
4. **Distinguishes outcomes by type:**
   - A *denial* (the source says "no") is data — return the typed result with
     `verified: false`.
   - A *timeout / unreachable source* throws `VerificationTimeoutError` — the
     booking flow must treat "couldn't check right now" as retryable, distinct
     from a terminal denial.
   - *Malformed caller input* throws `InvalidVerificationInputError` before any
     network call.

The interfaces the real adapter must implement:

| Integration | Method |
|---|---|
| NADRA | `verifyCnic(cnic: string): Promise<NadraVerificationResult>` |
| FBR ATL | `getAtlStatus(cnic: string, ntn?: string): Promise<AtlStatusResult>` |
| DNFBP | `verifyDnfbpCertificate(certNumber: string): Promise<DnfbpVerificationResult>` |
| PLRA | `issueCertificate(transferId: string, payload: TransferPayload): Promise<PlraCertificate>` |

## 3. Data-handling requirements (non-negotiable)

- **Never log or cache CNIC/NTN in plaintext** — including in error messages and
  debug logs. Any CNIC/NTN that gets persisted goes through
  `packages/database/encryption.ts` (AES-256-GCM) first. See
  `verification-adapters.mdc` and `security.mdc`.
- **Respect upstream rate limits.** Verification-triggering procedures are rate
  limited in `packages/api-client`; do not add a second uncontrolled call path.
- **No real endpoints in tests/CI.** Tests and E2E always run against the mock
  adapters — never against live government endpoints, even in "staging", unless
  it's an explicitly separate, manually-triggered suite. See `testing.mdc`.

## 4. Verify the swap

1. Set the integration's two env vars to live credentials.
2. Confirm the factory now returns the real adapter:
   `createVerificationAdapters().nadra instanceof RealNadraAdapter`.
3. Run a single live call against a known test identity in a non-production
   environment and confirm the response parses against its Zod schema.
4. Leave the other integrations on mocks until each is independently ready —
   the factory switches them one at a time.

## 5. Rollback

Unset the integration's `*_API_URL` / `*_API_KEY` (both) and redeploy. The
factory falls back to the mock with no code change.
