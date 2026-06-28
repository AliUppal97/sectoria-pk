import {
  idSchema,
  plraCertificateSchema,
  type PlraCertificate,
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
import {
  transferPayloadSchema,
  type PlraCertificateAdapter,
  type TransferPayload,
} from "./interface.js";

/** Number of distinct certificate serial values the mock generates. */
const MOCK_SERIAL_SPACE = 1_000_000;

/**
 * Mock PLRA adapter producing schema-valid certificates with simulated latency.
 * The certificate number is deterministic per transfer id, so re-issuing for the
 * same transfer yields the same certificate number.
 */
export class MockPlraAdapter implements PlraCertificateAdapter {
  private readonly options: ResolvedMockOptions;

  constructor(options: MockAdapterOptions = {}) {
    this.options = resolveMockOptions(options);
  }

  async issueCertificate(
    transferId: string,
    payload: TransferPayload,
  ): Promise<PlraCertificate> {
    const parsedTransferId = idSchema.safeParse(transferId);
    if (!parsedTransferId.success) {
      throw new InvalidVerificationInputError(
        "PLRA issueCertificate requires a non-empty transferId.",
      );
    }

    const parsedPayload = transferPayloadSchema.safeParse(payload);
    if (!parsedPayload.success) {
      throw new InvalidVerificationInputError(
        `PLRA issueCertificate received a malformed transfer payload: ${parsedPayload.error.message}`,
      );
    }

    await simulateLatency(this.options);

    const issuedAtIso = nowIso(this.options);
    const issueYear = this.options.now().getUTCFullYear();
    const serial = pickIndex(parsedTransferId.data, MOCK_SERIAL_SPACE)
      .toString()
      .padStart(6, "0");
    const certificateNumber = `PLRA-${issueYear}-${serial}`;

    const result: PlraCertificate = {
      transferId: parsedTransferId.data,
      certificateNumber,
      issuedAt: issuedAtIso,
      documentUrl: `https://certificates.plra.gov.pk/${certificateNumber}.pdf`,
    };

    return plraCertificateSchema.parse(result);
  }
}
