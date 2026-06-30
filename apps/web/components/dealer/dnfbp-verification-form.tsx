"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  Button,
  FieldError,
  Input,
  Label,
  StatusBadge,
  TrustBadge,
} from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

type VerificationPhase = "idle" | "pending" | "verified" | "rejected";

interface DnfbpVerificationFormProps {
  initialCertNumber: string | null;
  initialVerified: boolean;
}

/**
 * DNFBP certificate spot-check form. Shows pending → verified/rejected through
 * the verification adapter, with StatusBadge states (never a bare checkmark).
 */
export function DnfbpVerificationForm({
  initialCertNumber,
  initialVerified,
}: DnfbpVerificationFormProps) {
  const utils = api.useUtils();
  const mutation = api.dealer.submitDnfbpCertificate.useMutation({
    onSuccess: async () => {
      await utils.dealer.getMyProfile.invalidate();
      await utils.dealer.getPortalOverview.invalidate();
    },
  });

  const [certNumber, setCertNumber] = useState(initialCertNumber ?? "");
  const [phase, setPhase] = useState<VerificationPhase>(() => {
    if (initialVerified) return "verified";
    if (initialCertNumber) return "rejected";
    return "idle";
  });
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = certNumber.trim();
    if (trimmed.length === 0) {
      setError("Enter your DNFBP certificate number before submitting.");
      return;
    }

    setError(null);
    setPhase("pending");

    try {
      const result = await mutation.mutateAsync({ certNumber: trimmed });
      setCheckedAt(result.checkedAt);
      setPhase(result.verified ? "verified" : "rejected");
    } catch {
      setPhase(initialVerified ? "verified" : initialCertNumber ? "rejected" : "idle");
      setError(
        "We couldn't verify your certificate right now. Check the number and try again.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "pending" ? (
          <StatusBadge variant="warning" pulse>
            Verification pending — checking with DNFBP registry
          </StatusBadge>
        ) : phase === "verified" ? (
          <>
            <TrustBadge variant="dnfbp" />
            <StatusBadge variant="success">
              DNFBP certificate verified
            </StatusBadge>
          </>
        ) : phase === "rejected" ? (
          <StatusBadge
            variant="danger"
            title="The certificate number was not found or is not active in the DNFBP registry."
          >
            Certificate rejected — not found in DNFBP registry
          </StatusBadge>
        ) : (
          <StatusBadge variant="neutral">
            Not submitted — add your DNFBP certificate to appear as verified
          </StatusBadge>
        )}
      </div>

      {checkedAt && phase === "verified" ? (
        <p className="font-sans text-sm text-text-secondary">
          Last checked{" "}
          {new Date(checkedAt).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          . Your registration is active in the mock DNFBP registry.
        </p>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dnfbp-cert">DNFBP certificate number</Label>
          <Input
            id="dnfbp-cert"
            name="certNumber"
            value={certNumber}
            onChange={(event) => setCertNumber(event.target.value)}
            placeholder="e.g. DNFBP-2025-4001"
            disabled={phase === "pending"}
            aria-describedby={error ? "dnfbp-error" : "dnfbp-hint"}
          />
          <p id="dnfbp-hint" className="font-sans text-xs text-text-tertiary">
            We spot-check this against the DNFBP AML/CFT registry. For demo
            rejection, prefix with{" "}
            <span className="font-mono">REJECT-</span>.
          </p>
          {error ? <FieldError id="dnfbp-error">{error}</FieldError> : null}
        </div>

        <Button
          type="submit"
          disabled={phase === "pending" || mutation.isPending}
          className="w-full sm:w-auto"
        >
          {phase === "pending" || mutation.isPending ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              Checking certificate…
            </>
          ) : (
            "Submit for verification"
          )}
        </Button>
      </form>
    </div>
  );
}
