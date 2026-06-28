import {
  AtlStatus,
  atlStatusResultSchema,
  cnicSchema,
  ntnSchema,
  type AtlStatus as AtlStatusType,
  type AtlStatusResult,
} from "@sectoria/types";
import { InvalidVerificationInputError } from "../errors.js";
import {
  nowIso,
  pickIndex,
  resolveMockOptions,
  simulateLatency,
  type MockAdapterOptions,
  type ResolvedMockOptions,
} from "../mock-support.js";
import type { FbrAtlAdapter } from "./interface.js";

/** The ATL statuses the mock rotates through, deterministically per CNIC. */
const ATL_STATUS_POOL: readonly AtlStatusType[] = [
  AtlStatus.FILER,
  AtlStatus.FILER,
  AtlStatus.LATE_FILER,
  AtlStatus.NON_FILER,
];

/**
 * Mock FBR ATL adapter returning schema-valid taxpayer statuses with simulated
 * latency. Output is deterministic per CNIC. A `FILER`/`LATE_FILER` is reported
 * as an active taxpayer; a `NON_FILER` is not.
 */
export class MockFbrAtlAdapter implements FbrAtlAdapter {
  private readonly options: ResolvedMockOptions;

  constructor(options: MockAdapterOptions = {}) {
    this.options = resolveMockOptions(options);
  }

  async getAtlStatus(cnic: string, ntn?: string): Promise<AtlStatusResult> {
    const parsedCnic = cnicSchema.safeParse(cnic);
    if (!parsedCnic.success) {
      throw new InvalidVerificationInputError(
        "FBR getAtlStatus requires a CNIC in the form XXXXX-XXXXXXX-X.",
      );
    }

    const parsedNtn =
      ntn === undefined ? undefined : ntnSchema.safeParse(ntn);
    if (parsedNtn && !parsedNtn.success) {
      throw new InvalidVerificationInputError(
        "FBR getAtlStatus received a malformed NTN.",
      );
    }

    await simulateLatency(this.options);

    const atlStatus = ATL_STATUS_POOL[
      pickIndex(parsedCnic.data, ATL_STATUS_POOL.length)
    ]!;

    const result: AtlStatusResult = {
      cnic: parsedCnic.data,
      ...(parsedNtn ? { ntn: parsedNtn.data } : {}),
      atlStatus,
      isActiveTaxpayer: atlStatus !== AtlStatus.NON_FILER,
      checkedAt: nowIso(this.options),
    };

    return atlStatusResultSchema.parse(result);
  }
}
