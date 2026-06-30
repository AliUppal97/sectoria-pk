import { CheckCircle2, Lock } from "lucide-react";

/** A label/value pair shown in the confirmation's glass data grid. */
interface ConfirmationDetail {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}

/**
 * Booking-confirmation receipt for the end of the wizard (design spec §5.5 /
 * §7.2 stamp reveal). It mirrors the premium navy-gradient + glass treatment of
 * the PLRA {@link CertificateCard} and shares the `animate-stamp` reveal — but
 * is deliberately a *booking confirmation*, NOT a PLRA property certificate.
 * The official PLRA certificate only exists once transfer documents are issued
 * much later in the escrow flow, so presenting this as one would be misleading
 * (000-core.mdc: no silent misrepresentation of legal/compliance artefacts).
 */
export function BookingConfirmationCard({
  reference,
  details,
}: {
  reference: string;
  details: readonly ConfirmationDetail[];
}) {
  return (
    <div className="animate-stamp relative overflow-hidden rounded-xl bg-linear-to-br from-cert-from to-cert-to p-7 text-text-inverse">
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-50 w-50 rounded-full bg-text-inverse/5"
      />

      <div className="relative">
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-2.5 py-1 font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
            Booking Confirmed
          </span>
          <h3 className="mt-3 font-sans text-xl font-bold">
            Your plot is reserved in escrow
          </h3>
          <p className="font-sans text-sm text-text-inverse/45">
            Booking reference{" "}
            <span className="font-mono tracking-wider">{reference}</span>
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="rounded-md border border-text-inverse/10 bg-cert-glass px-3 py-2.5"
            >
              <dt className="font-sans text-3xs uppercase tracking-[0.06em] text-text-inverse/45">
                {detail.label}
              </dt>
              <dd
                className={
                  detail.mono
                    ? "mt-0.5 font-mono text-sm font-semibold tracking-wider text-text-inverse"
                    : "mt-0.5 font-sans text-sm font-semibold text-text-inverse"
                }
              >
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex items-center gap-2 text-text-inverse/45">
          <Lock aria-hidden="true" className="h-3.5 w-3.5" />
          <p className="font-sans text-3xs">
            Your booking token is held in escrow and only released to the society
            as the transfer milestones complete.
          </p>
        </div>
      </div>
    </div>
  );
}
