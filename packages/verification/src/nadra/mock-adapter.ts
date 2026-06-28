import {
  cnicSchema,
  nadraVerificationResultSchema,
  type IsoDateTime,
  type NadraVerificationResult,
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
import type { NadraVerificationAdapter } from "./interface.js";

/** Realistic Pakistani demo identities the mock rotates through, keyed by CNIC. */
const DEMO_IDENTITIES: ReadonlyArray<{
  readonly fullName: string;
  readonly fatherName: string;
  /** UTC date-of-birth parts: [year, monthIndex, day]. */
  readonly dateOfBirthUtc: readonly [number, number, number];
}> = [
  {
    fullName: "Ahmed Raza Khan",
    fatherName: "Muhammad Aslam Khan",
    dateOfBirthUtc: [1988, 2, 14],
  },
  {
    fullName: "Fatima Zahra Sheikh",
    fatherName: "Abdul Sattar Sheikh",
    dateOfBirthUtc: [1992, 6, 3],
  },
  {
    fullName: "Bilal Ahmed Malik",
    fatherName: "Tariq Mehmood Malik",
    dateOfBirthUtc: [1985, 10, 27],
  },
  {
    fullName: "Ayesha Siddiqui",
    fatherName: "Imran Siddiqui",
    dateOfBirthUtc: [1995, 0, 9],
  },
  {
    fullName: "Usman Ghani Butt",
    fatherName: "Riaz Ahmed Butt",
    dateOfBirthUtc: [1979, 4, 21],
  },
];

/**
 * Mock NADRA adapter returning schema-valid, realistic Pakistani identity data
 * with simulated network latency. Output is deterministic per CNIC (the same
 * CNIC always resolves to the same demo identity), which keeps tests stable.
 */
export class MockNadraAdapter implements NadraVerificationAdapter {
  private readonly options: ResolvedMockOptions;

  constructor(options: MockAdapterOptions = {}) {
    this.options = resolveMockOptions(options);
  }

  async verifyCnic(cnic: string): Promise<NadraVerificationResult> {
    const parsedCnic = cnicSchema.safeParse(cnic);
    if (!parsedCnic.success) {
      throw new InvalidVerificationInputError(
        "NADRA verifyCnic requires a CNIC in the form XXXXX-XXXXXXX-X.",
      );
    }

    await simulateLatency(this.options);

    const identity = DEMO_IDENTITIES[
      pickIndex(parsedCnic.data, DEMO_IDENTITIES.length)
    ]!;
    const [year, monthIndex, day] = identity.dateOfBirthUtc;

    // Confidence in 0.900–0.999, deterministic from the CNIC.
    const biometricConfidence =
      Math.round((0.9 + pickIndex(parsedCnic.data, 100) / 1000) * 1000) / 1000;

    const result: NadraVerificationResult = {
      verified: true,
      cnic: parsedCnic.data,
      fullName: identity.fullName,
      fatherName: identity.fatherName,
      dateOfBirth: new Date(
        Date.UTC(year, monthIndex, day),
      ).toISOString() as IsoDateTime,
      biometricConfidence,
      verifiedAt: nowIso(this.options),
    };

    // Re-validate at the boundary: the mock must produce exactly what the real
    // API contract promises, never a shape the real source couldn't return.
    return nadraVerificationResultSchema.parse(result);
  }
}
