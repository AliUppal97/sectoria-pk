import { TrustScoreComponentKey } from "@sectoria/types";

/** Human labels for trust-score breakdown components (dealer portal + public profile). */
export const TRUST_SCORE_COMPONENT_LABEL: Record<string, string> = {
  [TrustScoreComponentKey.VERIFIED_TRANSACTIONS]: "Verified transactions",
  [TrustScoreComponentKey.BUYER_RATING]: "Buyer rating",
  [TrustScoreComponentKey.RESPONSE_TIME]: "Response time",
  [TrustScoreComponentKey.VERIFICATION_COMPLETENESS]: "License verification",
  [TrustScoreComponentKey.DISPUTE_RESOLUTION]: "Dispute resolution",
};
