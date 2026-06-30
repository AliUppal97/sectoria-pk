/** Client/server feature flags for the concierge transition (ADR-007). */
export function isLegacySelfServeBookingEnabled(): boolean {
  return process.env.FEATURE_LEGACY_SELF_SERVE_BOOKING === "true";
}

export function isPublicDealerDirectoryEnabled(): boolean {
  return process.env.FEATURE_PUBLIC_DEALER_DIRECTORY === "true";
}

export function isLegacySocietyBookingQueueEnabled(): boolean {
  return process.env.FEATURE_LEGACY_SOCIETY_BOOKING_QUEUE === "true";
}

/** Default concierge mode — legacy paths off unless explicitly enabled. */
export function isConciergeMode(): boolean {
  return !isLegacySelfServeBookingEnabled();
}
