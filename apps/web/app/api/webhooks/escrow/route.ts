import { z } from "zod";
import { Prisma, prisma } from "@sectoria/database";
import {
  FulfillmentStatus,
  LedgerEventType,
  QuotePaymentStatus,
  QuotePaymentType,
  QuoteStatus,
  idSchema,
} from "@sectoria/types";
import { readVerifiedWebhookBody } from "@/lib/webhooks/verify-signature";

const escrowWebhookSchema = z
  .object({
    eventId: z.string().min(1),
    type: z.enum([
      "payment.confirmed",
      "payment.failed",
      "refund.completed",
    ]),
    bookingId: idSchema.optional(),
    quoteId: idSchema.optional(),
    quotePaymentType: z.enum(["TOKEN", "INSTALLMENT"]).optional(),
    installmentIndex: z.number().int().nonnegative().optional(),
    amountPkr: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) => data.bookingId !== undefined || data.quoteId !== undefined,
    { message: "Either bookingId or quoteId is required." },
  );

/**
 * Escrow provider webhook — payment confirmations, refund notifications, etc.
 * Signature is verified on the raw body before any JSON parsing (security.mdc).
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.ESCROW_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Escrow webhook is not configured." },
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

  const parsed = escrowWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Payload validation failed." }, { status: 400 });
  }

  if (parsed.data.type !== "payment.confirmed") {
    return Response.json({ received: true, eventId: parsed.data.eventId });
  }

  if (parsed.data.quoteId !== undefined) {
    const processed = await processQuotePaymentWebhook({
      eventId: parsed.data.eventId,
      quoteId: parsed.data.quoteId,
      quotePaymentType: parsed.data.quotePaymentType,
      installmentIndex: parsed.data.installmentIndex,
      amountPkr: parsed.data.amountPkr,
    });
    return Response.json({
      received: true,
      eventId: parsed.data.eventId,
      ...processed,
    });
  }

  return Response.json({ received: true, eventId: parsed.data.eventId });
}

async function processQuotePaymentWebhook(data: {
  eventId: string;
  quoteId: string;
  quotePaymentType?: "TOKEN" | "INSTALLMENT";
  installmentIndex?: number;
  amountPkr?: number;
}): Promise<{ duplicate: boolean }> {
  const paymentType =
    data.quotePaymentType === "INSTALLMENT"
      ? QuotePaymentType.INSTALLMENT
      : QuotePaymentType.TOKEN;

  const existing = await prisma.quotePayment.findFirst({
    where: { externalEventId: data.eventId },
  });
  if (existing !== null) {
    return { duplicate: true };
  }

  const quote = await prisma.quote.findUnique({
    where: { id: data.quoteId },
  });
  if (quote === null) {
    return { duplicate: false };
  }

  const amountPkr =
    data.amountPkr ??
    (paymentType === QuotePaymentType.TOKEN ? quote.tokenAmountPkr : 0);

  await prisma.$transaction(async (tx) => {
    await tx.quotePayment.create({
      data: {
        quoteId: quote.id,
        type: paymentType,
        amountPkr,
        installmentIndex: data.installmentIndex ?? null,
        status: QuotePaymentStatus.CONFIRMED,
        externalEventId: data.eventId,
      },
    });

    if (
      paymentType === QuotePaymentType.TOKEN &&
      quote.status === QuoteStatus.ACCEPTED
    ) {
      const existingOrder = await tx.fulfillmentOrder.findUnique({
        where: { quoteId: quote.id },
      });
      if (existingOrder === null) {
        await tx.fulfillmentOrder.create({
          data: {
            quoteId: quote.id,
            dealerId: quote.dealerId,
            orderRef: `FO-${quote.id.slice(-8).toUpperCase()}`,
            status: FulfillmentStatus.PENDING,
          },
        });
      }
    }

    await tx.ledgerEvent.create({
      data: {
        id: crypto.randomUUID(),
        type: LedgerEventType.QUOTE_PAYMENT_CONFIRMED,
        entityId: quote.id,
        payload: {
          type: paymentType,
          amountPkr,
          externalEventId: data.eventId,
        } as Prisma.InputJsonValue,
        createdAt: new Date(),
      },
    });
  });

  return { duplicate: false };
}
