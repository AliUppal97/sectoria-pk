import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies an HMAC-SHA256 webhook signature against the raw request body.
 * Call this on the raw body string **before** parsing JSON — per `security.mdc`
 * and `middleware-and-guards.mdc`, signature verification is the webhook's
 * authentication step and must precede any payload processing.
 *
 * Accepts signatures as a bare hex digest or prefixed with `sha256=`.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (signature === null || signature.length === 0) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature;

  if (provided.length !== expected.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Reads the raw body and verifies the `x-webhook-signature` header. Returns the
 * raw body on success so the caller can parse it only after authentication.
 */
export async function readVerifiedWebhookBody(
  req: Request,
  secret: string,
): Promise<{ ok: true; rawBody: string } | { ok: false; response: Response }> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid webhook signature." }, { status: 401 }),
    };
  }

  return { ok: true, rawBody };
}
