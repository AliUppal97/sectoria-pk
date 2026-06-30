"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Fingerprint,
  Share2,
  ShieldCheck,
} from "lucide-react";
import {
  AllocationStrategy,
  AtlStatus,
  EscrowState,
  cnicSchema,
  idSchema,
  pkrAmountSchema,
  type PlotType,
} from "@sectoria/types";
import { calculateTransferTax } from "@sectoria/domain-tax";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  TaxBreakdownCard,
  TrustBadge,
  formatDate,
  formatPKR,
  maskCnic,
} from "@sectoria/ui";
import { api } from "@/lib/trpc/react";
import { atlInfo } from "@/lib/atl";
import { ESCROW_LABEL } from "@/lib/escrow-display";
import { WizardStepper, type WizardStep } from "./wizard-stepper";
import { NadraScan } from "./nadra-scan";
import { BookingConfirmationCard } from "./booking-confirmation-card";

const STEPS: readonly WizardStep[] = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Tax" },
  { id: 3, label: "Review" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Confirmation" },
];

export interface WizardCategory {
  readonly id: string;
  readonly phase: string;
  readonly block: string;
  readonly sizeLabel: string;
  readonly plotType: PlotType;
  readonly allocationStrategy: AllocationStrategy;
  readonly societyName: string | null;
}

export interface WizardPlan {
  readonly id: string;
  readonly label: string;
  readonly downPaymentPct: string;
  readonly installmentCount: number;
  readonly installmentInterval: string;
}

interface ResumeBooking {
  readonly id: string;
  readonly status: EscrowState;
  readonly createdAt: string;
}

export interface BookingWizardProps {
  readonly category: WizardCategory;
  readonly plans: readonly WizardPlan[];
  readonly defaultSalePrice: number;
  /** Government FBR table value for this plot's zone (whole rupees) — read-only. */
  readonly fbrTableValue: number;
  /** Whether `fbrTableValue` came from the valuation table vs a sale-price fallback. */
  readonly fbrOnRecord: boolean;
  /** The category's FBR valuation zone key, shown beside the figure. */
  readonly fbrZone: string;
  readonly nadraVerified: boolean;
  readonly atlStatus: AtlStatus;
  readonly existingBooking: ResumeBooking | null;
}

function bookingReference(id: string): string {
  return `SEC-${id.slice(-6).toUpperCase()}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Formats raw digits into the canonical CNIC mask `XXXXX-XXXXXXX-X`. */
function formatCnicInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  const parts = [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12, 13)];
  return parts.filter((part) => part.length > 0).join("-");
}

export function BookingWizard({
  category,
  plans,
  defaultSalePrice,
  fbrTableValue,
  fbrOnRecord,
  fbrZone,
  nadraVerified,
  atlStatus,
  existingBooking,
}: BookingWizardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [verified, setVerified] = useState(nadraVerified);
  const [cnic, setCnic] = useState("");
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifiedCnicMask, setVerifiedCnicMask] = useState<string | null>(null);

  const [salePrice, setSalePrice] = useState(defaultSalePrice);
  const [selectedPlanId, setSelectedPlanId] = useState(
    plans[0]?.id ?? "",
  );

  const [createdBooking, setCreatedBooking] = useState<ResumeBooking | null>(
    existingBooking,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const verifyMutation = api.verification.verifyCnic.useMutation();
  const createMutation = api.booking.create.useMutation();

  // How far the buyer is allowed to be: identity gates everything; a created
  // booking unlocks the confirmation. Steps stay independently URL-addressable
  // but can't be skipped past these gates.
  const maxReached = createdBooking !== null ? 5 : verified ? 4 : 1;

  const rawStep = Number(searchParams.get("step")) || 1;
  const step = clamp(rawStep, 1, maxReached);

  // Keep the URL honest: if a deep-link/refresh lands past the allowed step,
  // rewrite it so the address bar always reflects the real position.
  useEffect(() => {
    if (rawStep !== step) {
      const params = new URLSearchParams(searchParams);
      params.set("step", String(step));
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [rawStep, step, pathname, router, searchParams]);

  function goTo(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set("step", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  const taxableValue = Math.max(Math.round(salePrice), Math.round(fbrTableValue));
  const tax = useMemo(() => {
    try {
      return calculateTransferTax({
        salePrice: pkrAmountSchema.parse(Math.round(salePrice)),
        fbrTableValue: pkrAmountSchema.parse(Math.round(fbrTableValue)),
        sellerAtlStatus: AtlStatus.FILER,
        buyerAtlStatus: atlStatus,
        plotType: category.plotType,
      });
    } catch {
      return null;
    }
  }, [salePrice, fbrTableValue, atlStatus, category.plotType]);
  const taxValid = tax !== null && salePrice > 0;

  const atl = atlInfo(atlStatus, taxableValue);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const tokenAmount = selectedPlan
    ? Math.round((salePrice * Number(selectedPlan.downPaymentPct)) / 100)
    : 0;

  const categoryLabel = `${category.phase} · ${category.block} · ${category.sizeLabel}`;
  const societyLabel = category.societyName ?? "the society";

  async function onVerify() {
    const parsed = cnicSchema.safeParse(cnic);
    if (!parsed.success) {
      setCnicError("Enter a CNIC in the form XXXXX-XXXXXXX-X.");
      return;
    }
    setCnicError(null);
    try {
      const result = await verifyMutation.mutateAsync({ cnic: parsed.data });
      if (result.verified) {
        setVerified(true);
        setVerifiedName(result.fullName ?? null);
        setVerifiedCnicMask(maskCnic(parsed.data));
        goTo(2);
      }
    } catch {
      // Surfaced below via verifyMutation.error.
    }
  }

  async function onConfirmPay() {
    if (!selectedPlan || !taxValid || createdBooking !== null) return;
    try {
      const booking = await createMutation.mutateAsync({
        categoryId: idSchema.parse(category.id),
        paymentPlanId: idSchema.parse(selectedPlan.id),
        agreedSalePrice: pkrAmountSchema.parse(Math.round(salePrice)),
      });
      setCreatedBooking({
        id: booking.id,
        status: booking.status,
        createdAt: booking.createdAt,
      });
      setConfirmOpen(false);
      goTo(5);
    } catch {
      setConfirmOpen(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <WizardStepper
          steps={STEPS}
          current={step}
          maxReached={maxReached}
          onStepSelect={goTo}
        />
      </div>

      {/* `key` retriggers the slide-in on each step change. */}
      <div key={step} className="animate-step-in">
        {step === 1 ? (
          <StepIdentity
            verified={verified}
            cnic={cnic}
            cnicError={cnicError}
            verifiedName={verifiedName}
            verifiedCnicMask={verifiedCnicMask}
            pending={verifyMutation.isPending}
            errorMessage={verifyMutation.error?.message ?? null}
            onCnicChange={(value) => {
              setCnic(formatCnicInput(value));
              if (cnicError) setCnicError(null);
            }}
            onVerify={onVerify}
            onContinue={() => goTo(2)}
          />
        ) : null}

        {step === 2 ? (
          <StepTax
            salePrice={salePrice}
            fbrValue={fbrTableValue}
            fbrOnRecord={fbrOnRecord}
            fbrZone={fbrZone}
            onSalePrice={setSalePrice}
            taxableValue={taxableValue}
            taxTotal={tax?.total ?? null}
            atlLabel={atl.label}
            atlBadge={atl.badgeVariant}
            atlImplication={atl.implication}
            isFiler={atlStatus === AtlStatus.FILER}
            valid={taxValid}
            onBack={() => goTo(1)}
            onContinue={() => goTo(3)}
          />
        ) : null}

        {step === 3 ? (
          <StepReview
            tax={tax}
            salePrice={salePrice}
            fbrValue={fbrTableValue}
            taxableValue={taxableValue}
            onBack={() => goTo(2)}
            onContinue={() => goTo(4)}
          />
        ) : null}

        {step === 4 ? (
          <StepPayment
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelectPlan={setSelectedPlanId}
            tokenAmount={tokenAmount}
            taxValid={taxValid}
            alreadyBooked={createdBooking !== null}
            bookingId={createdBooking?.id ?? null}
            confirmOpen={confirmOpen}
            onConfirmOpenChange={setConfirmOpen}
            paying={createMutation.isPending}
            errorMessage={createMutation.error?.message ?? null}
            onConfirmPay={onConfirmPay}
            onBack={() => goTo(3)}
          />
        ) : null}

        {step === 5 && createdBooking !== null ? (
          <StepConfirmation
            booking={createdBooking}
            categoryLabel={categoryLabel}
            societyLabel={societyLabel}
            allocationStrategy={category.allocationStrategy}
            phaseBlock={`${category.phase} · ${category.block}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="font-sans text-sm text-text-secondary">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StepIdentity({
  verified,
  cnic,
  cnicError,
  verifiedName,
  verifiedCnicMask,
  pending,
  errorMessage,
  onCnicChange,
  onVerify,
  onContinue,
}: {
  verified: boolean;
  cnic: string;
  cnicError: string | null;
  verifiedName: string | null;
  verifiedCnicMask: string | null;
  pending: boolean;
  errorMessage: string | null;
  onCnicChange: (value: string) => void;
  onVerify: () => void;
  onContinue: () => void;
}) {
  return (
    <StepShell
      title="Verify your identity"
      description="A one-time NADRA CNIC check confirms you're a real, eligible buyer before any money moves into escrow."
    >
      {verified ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <TrustBadge variant="nadra" />
            <StatusBadge variant="success">Verified</StatusBadge>
          </div>
          <div className="rounded-md border border-success-border bg-success-bg p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="h-5 w-5 text-success-text"
              />
              <p className="font-sans text-sm font-semibold text-success-text">
                Identity confirmed against NADRA records
              </p>
            </div>
            {(verifiedName ?? verifiedCnicMask) ? (
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {verifiedName ? (
                  <div>
                    <dt className="font-sans text-2xs uppercase tracking-[0.06em] text-text-tertiary">
                      Name
                    </dt>
                    <dd className="font-sans text-sm font-medium text-text-primary">
                      {verifiedName}
                    </dd>
                  </div>
                ) : null}
                {verifiedCnicMask ? (
                  <div>
                    <dt className="font-sans text-2xs uppercase tracking-[0.06em] text-text-tertiary">
                      CNIC
                    </dt>
                    <dd className="font-mono text-sm tracking-wider text-text-primary">
                      {verifiedCnicMask}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 font-sans text-xs text-text-tertiary">
                Your CNIC is stored encrypted and is never shown in full.
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={onContinue}>
              Continue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : pending ? (
        <NadraScan />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnic">CNIC number</Label>
            <Input
              id="cnic"
              mono
              inputMode="numeric"
              autoComplete="off"
              placeholder="35202-1234567-1"
              value={cnic}
              maxLength={15}
              invalid={cnicError !== null}
              aria-describedby={cnicError ? "cnic-error" : undefined}
              onChange={(event) => onCnicChange(event.target.value)}
            />
            {cnicError ? (
              <FieldError id="cnic-error">{cnicError}</FieldError>
            ) : (
              <p className="font-sans text-xs text-text-tertiary">
                Format: XXXXX-XXXXXXX-X. We check this against NADRA and store it
                encrypted.
              </p>
            )}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-md border border-danger-border bg-danger-bg p-3 font-sans text-xs text-danger-text"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={onVerify}>
              <Fingerprint aria-hidden="true" className="h-4 w-4" />
              Verify with NADRA
            </Button>
          </div>
        </div>
      )}
    </StepShell>
  );
}

function StepTax({
  salePrice,
  fbrValue,
  fbrOnRecord,
  fbrZone,
  onSalePrice,
  taxableValue,
  taxTotal,
  atlLabel,
  atlBadge,
  atlImplication,
  isFiler,
  valid,
  onBack,
  onContinue,
}: {
  salePrice: number;
  fbrValue: number;
  fbrOnRecord: boolean;
  fbrZone: string;
  onSalePrice: (value: number) => void;
  taxableValue: number;
  taxTotal: number | null;
  atlLabel: string;
  atlBadge: NonNullable<React.ComponentProps<typeof StatusBadge>["variant"]>;
  atlImplication: string;
  isFiler: boolean;
  valid: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <StepShell
      title="Calculate your transfer tax"
      description="FBR taxes whichever is higher — the agreed sale price or the FBR table value. Your figures update live as you change the sale price."
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salePrice">Agreed sale price (PKR)</Label>
            <Input
              id="salePrice"
              type="number"
              min={0}
              mono
              value={Number.isFinite(salePrice) ? salePrice : ""}
              onChange={(event) => onSalePrice(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fbrValue">FBR table value (PKR)</Label>
            <Input
              id="fbrValue"
              mono
              readOnly
              aria-describedby="fbr-note"
              value={formatPKR(fbrValue)}
              className="bg-surface-inset"
            />
            <p id="fbr-note" className="font-sans text-xs text-text-tertiary">
              {fbrOnRecord
                ? `Government valuation for ${fbrZone} — set by FBR, not editable.`
                : "No FBR valuation on record for this zone; the sale price is used."}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border-base bg-surface-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-xs text-text-tertiary">
              Taxable value (higher of the two)
            </span>
            <span className="font-mono text-sm font-semibold text-text-primary">
              {valid ? formatPKR(taxableValue) : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border-base pt-2">
            <span className="font-sans text-sm font-semibold text-text-primary">
              Estimated total tax &amp; fees
            </span>
            <span className="font-sans text-lg font-bold text-brand-navy">
              {valid && taxTotal !== null ? formatPKR(taxTotal) : "—"}
            </span>
          </div>
        </div>

        {/* ATL status WITH its tax implication beneath — the platform's signature. */}
        <div className="rounded-md border border-border-base p-4">
          <div className="flex items-center gap-2">
            {isFiler ? (
              <TrustBadge variant="fbrFiler" />
            ) : (
              <StatusBadge variant={atlBadge}>{atlLabel}</StatusBadge>
            )}
            <span className="font-sans text-xs font-medium text-text-tertiary">
              FBR tax status
            </span>
          </div>
          <p className="mt-2 font-sans text-sm text-text-secondary">
            {atlImplication}
          </p>
        </div>

        {!valid ? (
          <FieldError>Enter a positive sale price to continue.</FieldError>
        ) : null}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={onContinue} disabled={!valid}>
            Review breakdown
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </StepShell>
  );
}

function StepReview({
  tax,
  salePrice,
  fbrValue,
  taxableValue,
  onBack,
  onContinue,
}: {
  tax: ReturnType<typeof calculateTransferTax> | null;
  salePrice: number;
  fbrValue: number;
  taxableValue: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  if (tax === null) {
    return (
      <StepShell
        title="Review your tax breakdown"
        description="We couldn't compute the tax from the values entered."
      >
        <FieldError>Go back and enter a positive sale price.</FieldError>
        <div className="mt-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Button>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      title="Review your tax breakdown"
      description="This itemised breakdown is computed by Sectoria's FBR tax engine and will be frozen onto your booking."
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryStat label="Sale price" value={formatPKR(salePrice)} />
          <SummaryStat label="FBR table value" value={formatPKR(fbrValue)} />
          <SummaryStat label="Taxable value" value={formatPKR(taxableValue)} />
        </dl>

        <TaxBreakdownCard breakdown={tax} />

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={onContinue}>
            Continue to payment
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </StepShell>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-base bg-surface-card p-3">
      <dt className="font-sans text-2xs uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function StepPayment({
  plans,
  selectedPlanId,
  onSelectPlan,
  tokenAmount,
  taxValid,
  alreadyBooked,
  bookingId,
  confirmOpen,
  onConfirmOpenChange,
  paying,
  errorMessage,
  onConfirmPay,
  onBack,
}: {
  plans: readonly WizardPlan[];
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  tokenAmount: number;
  taxValid: boolean;
  alreadyBooked: boolean;
  bookingId: string | null;
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  paying: boolean;
  errorMessage: string | null;
  onConfirmPay: () => void;
  onBack: () => void;
}) {
  if (alreadyBooked && bookingId) {
    return (
      <StepShell
        title="Booking token paid"
        description="You've already paid the booking token for this plot — no second payment is needed."
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-md border border-success-border bg-success-bg p-4">
            <CheckCircle2
              aria-hidden="true"
              className="h-5 w-5 text-success-text"
            />
            <p className="font-sans text-sm font-semibold text-success-text">
              Your escrow booking token is recorded.
            </p>
          </div>
          <div className="flex justify-end">
            <Button asChild>
              <Link href={`/dashboard/bookings/${bookingId}`}>
                View booking
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      title="Pay your booking token"
      description="Choose a payment plan. Your booking token is held in escrow — released to the society only as transfer milestones complete."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plan">Payment plan</Label>
          <Select value={selectedPlanId} onValueChange={onSelectPlan}>
            <SelectTrigger id="plan" aria-label="Payment plan">
              <SelectValue placeholder="Select a payment plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-border-base bg-surface-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-sm font-semibold text-text-primary">
              Booking token due now
            </span>
            <span className="font-sans text-lg font-bold text-brand-navy">
              {formatPKR(tokenAmount)}
            </span>
          </div>
          {selectedPlanId ? (
            <p className="mt-1 font-sans text-xs text-text-tertiary">
              {plans.find((plan) => plan.id === selectedPlanId)?.downPaymentPct}%
              down payment, held in escrow.
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-md border border-danger-border bg-danger-bg p-3 font-sans text-xs text-danger-text"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Button>

          <Dialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
            <Button
              variant="success"
              disabled={!taxValid || !selectedPlanId || tokenAmount <= 0}
              onClick={() => onConfirmOpenChange(true)}
            >
              Pay {formatPKR(tokenAmount)}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm booking token payment</DialogTitle>
                <DialogDescription>
                  You&apos;re about to pay a booking token of{" "}
                  <span className="font-semibold text-text-primary">
                    {formatPKR(tokenAmount)}
                  </span>{" "}
                  into escrow. The funds are held securely and only released to
                  the society as your transfer milestones complete.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => onConfirmOpenChange(false)}
                  disabled={paying}
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  onClick={onConfirmPay}
                  disabled={paying}
                >
                  {paying ? "Processing…" : `Confirm & pay ${formatPKR(tokenAmount)}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </StepShell>
  );
}

function StepConfirmation({
  booking,
  categoryLabel,
  societyLabel,
  allocationStrategy,
  phaseBlock,
}: {
  booking: ResumeBooking;
  categoryLabel: string;
  societyLabel: string;
  allocationStrategy: AllocationStrategy;
  phaseBlock: string;
}) {
  const reference = bookingReference(booking.id);
  const allocationCopy =
    allocationStrategy === AllocationStrategy.BALLOT
      ? `You're entered into the ballot for ${phaseBlock}. ${societyLabel} will announce the balloting result.`
      : `Your slot in ${phaseBlock} is reserved. ${societyLabel} will assign your plot serial shortly.`;

  function onDownload() {
    if (typeof window !== "undefined") window.print();
  }

  async function onShare() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/dashboard/bookings/${booking.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Sectoria booking ${reference}`, url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
    } else {
      await navigator.clipboard?.writeText(url);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BookingConfirmationCard
        reference={reference}
        details={[
          { label: "Society", value: societyLabel },
          { label: "Plot", value: categoryLabel },
          { label: "Status", value: ESCROW_LABEL[booking.status] },
          { label: "Booked", value: formatDate(booking.createdAt) },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>What happens next</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="font-sans text-sm text-text-secondary">
            {allocationCopy}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onShare}>
              <Share2 aria-hidden="true" className="h-4 w-4" />
              Share
            </Button>
            <Button variant="ghost" onClick={onDownload}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Download
            </Button>
            <Button asChild>
              <Link href={`/dashboard/bookings/${booking.id}`}>
                View booking
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
