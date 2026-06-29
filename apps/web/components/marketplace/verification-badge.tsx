import { StatusBadge } from "@sectoria/ui";
import type { VerificationTier } from "@sectoria/database";
import { VERIFICATION_TIER_META } from "@/lib/marketplace";

/**
 * A society's verification-tier badge. The label states the tier and the
 * `title` carries the plain-language explanation, so the trust signal always
 * explains itself rather than being a bare coloured pill (ui-ux-excellence.mdc).
 */
export function VerificationTierBadge({
  tier,
  className,
}: {
  tier: VerificationTier;
  className?: string;
}) {
  const meta = VERIFICATION_TIER_META[tier];
  return (
    <StatusBadge
      variant={meta.variant}
      title={meta.explanation}
      className={className}
    >
      {meta.label}
    </StatusBadge>
  );
}
