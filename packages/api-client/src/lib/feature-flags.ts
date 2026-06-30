/** Reads concierge transition feature flags from the environment. */
export function isLegacySelfServeBookingEnabled(): boolean {
  return process.env.FEATURE_LEGACY_SELF_SERVE_BOOKING === "true";
}

export function isPublicDealerDirectoryEnabled(): boolean {
  return process.env.FEATURE_PUBLIC_DEALER_DIRECTORY === "true";
}

export function isLegacySocietyBookingQueueEnabled(): boolean {
  return process.env.FEATURE_LEGACY_SOCIETY_BOOKING_QUEUE === "true";
}
