import Link from "next/link";
import { Headphones, Lock, MapPin, Scale, ShieldCheck } from "lucide-react";
import { Button } from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { SectionHeading } from "@/components/marketplace/section-heading";

const FEATURES = [
  {
    icon: Scale,
    title: "Compare like-for-like",
    body: "Put societies side by side on price, approvals, development stage and location — no guesswork, no sales pressure.",
  },
  {
    icon: Headphones,
    title: "Best price via Sectoria",
    body: "Our advisors negotiate with authorized dealers on your behalf. You never deal with dealers directly on the public site.",
  },
  {
    icon: Lock,
    title: "Token payment on platform",
    body: "Reserve your plot with a booking token paid safely through Sectoria before allocation proceeds.",
  },
  {
    icon: MapPin,
    title: "Verified society data",
    body: "LOP/NOC references, development stage, payment plan types and map locations — checked before listing.",
  },
] as const;

/** Fuller “Why Sectoria” bento — demoted below discovery + featured. */
export function HomeWhyBento() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="Why Sectoria"
        title="Trust, built into every step"
        description="A marketplace designed for the buyer handing over millions of rupees remotely — every signal verifiable, nothing hidden."
      />
      <BentoGrid className="mt-8">
        <BentoCell size="anchor" tone="navy" className="flex flex-col justify-between gap-6">
          <ShieldCheck
            aria-hidden="true"
            className="h-10 w-10 text-brand-accent"
            strokeWidth={2}
          />
          <div className="flex flex-col gap-2">
            <h3 className="font-sans text-2xl font-bold text-text-inverse">
              Listings are checked, not just claimed
            </h3>
            <p className="font-sans text-sm text-text-inverse/70">
              We confirm a society&apos;s layout (LOP) and no-objection (NOC)
              approvals with its development authority — and surface the live
              HSMS link where one exists — before it ever appears here.
            </p>
          </div>
          <Button asChild variant="success" className="w-fit">
            <Link href="/societies?verificationTier=HSMS_LINKED">
              See HSMS-linked societies
            </Link>
          </Button>
        </BentoCell>

        {FEATURES.map((feature) => (
          <BentoCell key={feature.title} className="flex flex-col gap-3">
            <feature.icon
              aria-hidden="true"
              className="h-7 w-7 text-text-accent"
              strokeWidth={2}
            />
            <h3 className="font-sans text-lg font-bold text-text-primary">
              {feature.title}
            </h3>
            <p className="font-sans text-sm text-text-secondary">{feature.body}</p>
          </BentoCell>
        ))}
      </BentoGrid>
    </section>
  );
}
