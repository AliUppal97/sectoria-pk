"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
  StatusBadge,
  TrustBadge,
} from "@sectoria/ui";
import { VerificationTier } from "@sectoria/types";
import { api } from "@/lib/trpc/react";

interface ComplianceSettingsFormProps {
  societyId: string;
  lopReferenceNo: string | null;
  nocReferenceNo: string | null;
  hsmsLinked: boolean;
  verificationTier: string;
}

/** LOP/NOC reference numbers and HSMS link status for the society. */
export function ComplianceSettingsForm({
  societyId,
  lopReferenceNo,
  nocReferenceNo,
  hsmsLinked: initialHsms,
  verificationTier,
}: ComplianceSettingsFormProps) {
  const router = useRouter();
  const [lop, setLop] = useState(lopReferenceNo ?? "");
  const [noc, setNoc] = useState(nocReferenceNo ?? "");
  const [hsmsLinked, setHsmsLinked] = useState(initialHsms);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = api.society.updateCompliance.useMutation({
    onSuccess: () => {
      setSuccess("Compliance settings saved.");
      router.refresh();
    },
    onError: (err: { message: string }) => setError(err.message),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    mutation.mutate({
      societyId,
      lopReferenceNo: lop.trim().length > 0 ? lop.trim() : null,
      nocReferenceNo: noc.trim().length > 0 ? noc.trim() : null,
      hsmsLinked,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div className="flex flex-wrap gap-2">
        {verificationTier === VerificationTier.HSMS_LINKED ? (
          <>
            <TrustBadge variant="plra" />
            <StatusBadge variant="success">HSMS linked</StatusBadge>
          </>
        ) : verificationTier === VerificationTier.VERIFIED ? (
          <TrustBadge variant="plra" />
        ) : (
          <StatusBadge variant="warning">Verification pending</StatusBadge>
        )}
      </div>

      <div>
        <Label htmlFor="lop">LOP reference number</Label>
        <Input
          id="lop"
          className="mt-1.5"
          value={lop}
          onChange={(e) => setLop(e.target.value)}
          placeholder="LOP-LDA-2024-101"
        />
        <p className="mt-1 font-sans text-xs text-text-tertiary">
          Layout Plan approval reference from your development authority.
        </p>
      </div>

      <div>
        <Label htmlFor="noc">NOC reference number</Label>
        <Input
          id="noc"
          className="mt-1.5"
          value={noc}
          onChange={(e) => setNoc(e.target.value)}
          placeholder="NOC-LDA-2024-201"
        />
        <p className="mt-1 font-sans text-xs text-text-tertiary">
          No Objection Certificate reference confirming regulatory clearance.
        </p>
      </div>

      <div className="rounded-md border border-border-base bg-surface-subtle p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-sm font-semibold text-text-primary">
              HSMS integration
            </p>
            <p className="mt-1 font-sans text-xs text-text-tertiary">
              Housing Society Management System live link for inventory sync.
            </p>
          </div>
          <StatusBadge variant={hsmsLinked ? "success" : "neutral"}>
            {hsmsLinked ? "Linked" : "Not linked"}
          </StatusBadge>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hsmsLinked}
            onChange={(e) => setHsmsLinked(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong"
          />
          <span className="font-sans text-sm text-text-secondary">
            Mark HSMS as linked (requires LOP and NOC on file)
          </span>
        </label>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}
      {success ? (
        <p className="font-sans text-sm text-success-text">{success}</p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save compliance settings"}
      </Button>
    </form>
  );
}
