import { z } from "zod";
import { idSchema } from "@sectoria/types";
import { readVerifiedWebhookBody } from "@/lib/webhooks/verify-signature";

/**
 * Escrow provider webhook — payment confirmations, refund notifications, etc.
 * Signature is verified on the raw body before any JSON parsing (security.mdc).
 */
const escrowWebhookSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum([
    "payment.confirmed",
    "payment.failed",
    "refund.completed",
  ]),
  bookingId: idSchema,
  /** Whole-rupee amount when applicable — never log raw payment instrument data. */
  amountPkr: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.ESCROW_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Escrow webhook is not configured." }, { status: 503 });
  }

  const verified = await readVerifiedWebhookBody(req, secret);
  if (!verified.ok) return verified.response;

  let payload: unknown;
  try {
    payload = JSON.parse(verified.rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = escrowWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Payload validation failed." }, { status: 400 });
  }

  // Processing is deferred until the real escrow provider is integrated.
  // The audit requirement is signature-first verification; idempotency and
  // state transitions will be wired when the payment adapter lands.
  return Response.json({ received: true, eventId: parsed.data.eventId });
}
