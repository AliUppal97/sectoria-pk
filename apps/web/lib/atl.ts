import { AtlStatus, type AtlStatus as AtlStatusType } from "@sectoria/types";
import { CURRENT_FISCAL_YEAR_RATES } from "@sectoria/domain-tax";
import { formatPKR } from "@sectoria/ui";
import type { StatusBadgeProps } from "@sectoria/ui";

/**
 * Presentation metadata for an FBR Active-Taxpayer-List status.
 *
 * The single biggest piece of information Sectoria surfaces that other
 * platforms don't is *what the ATL status means for this transaction's tax*
 * (ui-ux-excellence.mdc §"ATL status always shows its tax implication"). The
 * purchase-tax percentage is read from the real Section 236K rate table in
 * `@sectoria/domain-tax` — never a hardcoded "3% / 6% / 12%" that could drift
 * from the engine's actual math.
 */
export interface AtlInfo {
  readonly label: string;
  readonly badgeVariant: NonNullable<StatusBadgeProps["variant"]>;
  /** Section 236K purchase-tax rate for this status, e.g. `3` for 3%. */
  readonly purchaseTaxPct: number;
  /** One-line implication beneath the status, naming the tax consequence. */
  readonly implication: string;
}

const RATE_236K = CURRENT_FISCAL_YEAR_RATES.section236K;

const RATE_BY_STATUS: Record<AtlStatusType, string> = {
  [AtlStatus.FILER]: RATE_236K.filer,
  [AtlStatus.LATE_FILER]: RATE_236K.lateFiler,
  [AtlStatus.NON_FILER]: RATE_236K.nonFiler,
};

const LABEL: Record<AtlStatusType, string> = {
  [AtlStatus.FILER]: "Filer",
  [AtlStatus.LATE_FILER]: "Late filer",
  [AtlStatus.NON_FILER]: "Non-filer",
};

const BADGE: Record<AtlStatusType, NonNullable<StatusBadgeProps["variant"]>> = {
  [AtlStatus.FILER]: "success",
  [AtlStatus.LATE_FILER]: "warning",
  [AtlStatus.NON_FILER]: "danger",
};

function pct(rate: string): number {
  // Rates are exact decimal strings ("0.03"); render as a whole percentage.
  return Math.round(Number(rate) * 1000) / 10;
}

/**
 * Builds the display info for an ATL status. When `taxableValue` is supplied (the
 * higher of sale price / FBR value, in whole rupees), the non-filer implication
 * quantifies how much *more* tax than a filer pays on this specific transaction.
 */
export function atlInfo(
  atlStatus: AtlStatusType,
  taxableValue?: number,
): AtlInfo {
  const purchaseTaxPct = pct(RATE_BY_STATUS[atlStatus]);
  const filerPct = pct(RATE_236K.filer);

  let implication: string;
  switch (atlStatus) {
    case AtlStatus.FILER:
      implication = `${purchaseTaxPct}% purchase tax applies — the lowest rate.`;
      break;
    case AtlStatus.LATE_FILER:
      implication = `${purchaseTaxPct}% purchase tax applies — filing on time would lower this to ${filerPct}%.`;
      break;
    case AtlStatus.NON_FILER: {
      const extra =
        taxableValue !== undefined
          ? Math.round(
              (Number(RATE_BY_STATUS[atlStatus]) - Number(RATE_236K.filer)) *
                taxableValue,
            )
          : undefined;
      implication =
        extra !== undefined
          ? `${purchaseTaxPct}% purchase tax applies — ${formatPKR(extra)} more than a filer pays on this transaction.`
          : `${purchaseTaxPct}% purchase tax applies — becoming a filer would reduce this to ${filerPct}%.`;
      break;
    }
    default:
      implication = `${purchaseTaxPct}% purchase tax applies.`;
  }

  return {
    label: LABEL[atlStatus],
    badgeVariant: BADGE[atlStatus],
    purchaseTaxPct,
    implication,
  };
}
