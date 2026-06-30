import { z } from "zod";
import { cnicSchema, pkrAmountSchema, type PlraCertificate } from "@sectoria/types";

/**
 * The transfer details a PLRA (Punjab Land Records Authority) certificate is
 * issued against. This shape crosses the adapter (network) boundary, so it has
 * a Zod schema and lives here in `packages/verification` — the certificate
 * *result* shape lives in `packages/types` (`plraCertificateSchema`), but this
 * *request* shape is specific to the PLRA integration.
 */
export const transferPayloadSchema = z.object({
  /** CNIC of the buyer the plot is transferred to. */
  buyerCnic: cnicSchema,
  /** Seller of record (the society), as printed on the certificate. */
  sellerName: z.string().min(1),
  /** The society the plot belongs to. */
  societyName: z.string().min(1),
  /** Human-readable plot reference, e.g. "Phase 2, Block C, Plot 145". */
  plotReference: z.string().min(1),
  /** Final sale price as a whole-rupee integer. */
  salePrice: pkrAmountSchema,
});
export type TransferPayload = z.infer<typeof transferPayloadSchema>;

/**
 * Contract for issuing a PLRA property certificate once a transfer completes.
 * Unlike the other adapters this *produces* a document rather than checking a
 * record, but it follows the same interface + mock + real pattern.
 *
 * @see Punjab Land Revenue Act 1967 — digitized property transfer records and
 *   certificates issued through PLRA (Punjab Land Records Authority).
 */
export interface PlraCertificateAdapter {
  /**
   * Generates a PLRA property certificate for a completed transfer.
   *
   * @see Punjab Land Revenue Act 1967 — statutory property certificate for a
   *   completed society plot/file transfer.
   *
   * @param transferId - The id of the completed transfer/booking.
   * @param payload - The transfer details to print on the certificate.
   * @returns A schema-valid {@link PlraCertificate}.
   * @throws {InvalidVerificationInputError} if `transferId`/`payload` is malformed.
   * @throws {VerificationTimeoutError} if the source could not be reached in time.
   */
  issueCertificate(
    transferId: string,
    payload: TransferPayload,
  ): Promise<PlraCertificate>;
}
