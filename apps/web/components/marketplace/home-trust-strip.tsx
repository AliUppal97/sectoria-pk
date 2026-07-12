import { Headphones, Lock, MapPin, Scale } from "lucide-react";

const TRUST_SIGNALS = [
  {
    icon: MapPin,
    title: "Verified data",
    body: "LOP/NOC references and development stage checked before listing.",
  },
  {
    icon: Headphones,
    title: "Advisor negotiation",
    body: "Sectoria advisors negotiate with authorized dealers on your behalf.",
  },
  {
    icon: Lock,
    title: "Token on platform",
    body: "Pay your booking token safely through Sectoria before allocation.",
  },
  {
    icon: Scale,
    title: "Compare like-for-like",
    body: "Price, approvals, stage and location — side by side, no sales pressure.",
  },
] as const;

/** Compact 4-up trust strip below the hero (homepage-ia §2). */
export function HomeTrustStrip() {
  return (
    <section
      className="border-b border-border-base bg-surface-subtle"
      aria-label="Why buyers trust Sectoria"
    >
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {TRUST_SIGNALS.map((signal) => (
          <div key={signal.title} className="flex flex-col gap-2">
            <signal.icon
              aria-hidden="true"
              className="h-5 w-5 text-text-accent"
              strokeWidth={2}
            />
            <h2 className="font-sans text-sm font-semibold text-text-primary">
              {signal.title}
            </h2>
            <p className="font-sans text-xs text-text-secondary">{signal.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
