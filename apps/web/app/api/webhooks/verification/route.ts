import { z } from "zod";
import { idSchema } from "@sectoria/types";
import { readVerifiedWebhookBody } from "@/lib/webhooks/verify-signature";

/**
 * Verification-provider callback webhook — async NADRA/FBR result delivery.
 * Signature is verified on the raw body before any JSON parsing (security.mdc).
 * Payloads reference entity IDs only; CNIC/NTN never appear in webhook bodies.
 */
const verificationWebhookSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(["nadra.completed", "fbr.atl.updated"]),
  userId: idSchema,
  verified: z.boolean(),
});

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.VERIFICATION_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Verification webhook is not configured." },
      { status: 503 },
    );
  }

  const verified = await readVerifiedWebhookBody(req, secret);
  if (!verified.ok) return verified.response;

  let payload: unknown;
  try {
    payload = JSON.parse(verified.rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = verificationWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Payload validation failed." }, { status: 400 });
  }

  return Response.json({ received: true, eventId: parsed.data.eventId });
}
