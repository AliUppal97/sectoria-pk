# @sectoria/verification

**Typed adapters for the four government integrations Sectoria depends on.**
Each integration is an *interface + swappable implementation*: a `Mock*` adapter
returning schema-valid, realistic Pakistani demo data with simulated network
latency, and a `Real*` stub awaiting production wiring. A single factory chooses
mock vs. real per integration from environment credentials.

| Integration | Interface | Purpose |
|---|---|---|
| NADRA | `NadraVerificationAdapter` | CNIC identity check + biometric confidence |
| FBR ATL | `FbrAtlAdapter` | Active Taxpayer List status (drives tax rates) |
| DNFBP | `DnfbpVerificationAdapter` | Dealer AML/CFT certificate spot-check |
| PLRA | `PlraCertificateAdapter` | Issue a property certificate for a completed transfer |

## Design

- **Interface is the boundary.** Swapping a mock for the real integration means
  writing one new `Real*` class that implements the same interface — nothing
  else in the app changes. See `verification-adapters.mdc`.
- **Mocks don't resolve instantly.** They wait a realistic 1–2 seconds by
  default so loading-state bugs surface in development. The clock, RNG, and
  `sleep` are injectable, so tests stay fast and deterministic.
- **Outputs are re-validated.** Every mock parses its own response against the
  shared Zod schema from `@sectoria/types` before returning — a mock can never
  produce a shape the real API contract wouldn't.
- **Failure ≠ timeout.** A denial is data (`verified: false`); an unreachable
  source is a thrown `VerificationTimeoutError`. Callers must handle them
  differently.

## Usage

```ts
import { createVerificationAdapters } from "@sectoria/verification";

// Reads process.env by default. With verification env vars blank (dev/test),
// every adapter is a mock returning realistic demo data.
const adapters = createVerificationAdapters();

const identity = await adapters.nadra.verifyCnic("35202-1234567-1");
// → { verified: true, cnic, fullName, biometricConfidence, verifiedAt, ... }

const atl = await adapters.fbrAtl.getAtlStatus("35202-1234567-1", "1234567");
// → { atlStatus: "FILER", isActiveTaxpayer: true, ... }

const dnfbp = await adapters.dnfbp.verifyDnfbpCertificate("DNFBP-2026-0001");
// → { verified: true, agencyName, expiresAt, ... }

const certificate = await adapters.plra.issueCertificate("transfer_abc", {
  buyerCnic: "35202-1234567-1",
  sellerName: "Capital Smart City (Pvt) Ltd",
  societyName: "Capital Smart City",
  plotReference: "Overseas Block, Plot 145",
  salePrice: 1_250_000_000, // paisa
});
// → { certificateNumber: "PLRA-2026-012345", documentUrl, ... }
```

Never call an adapter directly from a UI component or page — always go through
`packages/api-client`.

## Choosing mock vs. real

The factory decides **per integration** from env vars:

| `*_API_URL` | `*_API_KEY` | Result |
|---|---|---|
| blank | blank | **mock** |
| set | set | **real** |
| set | blank (or vice versa) | throws `VerificationConfigError` |

A partial configuration throws rather than silently falling back to a mock, so a
broken production deploy fails loudly. See the runbook below for env var names.

```ts
// Inject env + fast mocks explicitly (e.g. in tests):
const adapters = createVerificationAdapters({
  env: {},
  mock: { minLatencyMs: 0, maxLatencyMs: 0 },
});
```

## Swapping a mock for a real adapter

See [`docs/runbooks/swapping-verification-adapters.md`](../../docs/runbooks/swapping-verification-adapters.md)
for the exact env vars, the contract a real adapter must satisfy, and the
data-handling rules (CNIC/NTN encryption, never logging plaintext).

## Test

```bash
pnpm --filter @sectoria/verification test
```

Coverage includes: every mock response parsing against its `@sectoria/types`
schema, determinism per input, typed errors on malformed input, the factory
returning mocks on blank env and reals on full credentials (switched
independently per integration), partial-config failures, and the simulated
latency landing in the 1–2s window without the test actually waiting.
