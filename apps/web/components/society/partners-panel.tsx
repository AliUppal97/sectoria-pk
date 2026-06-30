"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthorizationStatus,
  type AuthorizationStatus as AuthorizationStatusType,
} from "@sectoria/types";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  TrustBadge,
} from "@sectoria/ui";
import { Users } from "lucide-react";
import { api } from "@/lib/trpc/react";

interface PartnerRow {
  id: string;
  status: AuthorizationStatusType;
  commissionSplitPct: string;
  categoryId: string | null;
  categoryLabel: string | null;
  dealer: {
    id: string;
    slug: string;
    agencyName: string;
    dnfbpVerified: boolean;
    completedDeals: number;
  };
}

interface DealerOption {
  id: string;
  agencyName: string;
  dnfbpVerified: boolean;
}

interface CategoryOption {
  id: string;
  label: string;
}

interface PartnersPanelProps {
  societyId: string;
  partners: readonly PartnerRow[];
  dealers: readonly DealerOption[];
  categories: readonly CategoryOption[];
}

/** Authorize and revoke dealer partners for the society. */
export function PartnersPanel({
  societyId,
  partners,
  dealers,
  categories,
}: PartnersPanelProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [dealerId, setDealerId] = useState(dealers[0]?.id ?? "");
  const [categoryScope, setCategoryScope] = useState<string>("all");
  const [commission, setCommission] = useState("5.00");
  const [error, setError] = useState<string | null>(null);

  const authorizeMutation = api.dealer.authorizePartner.useMutation({
    onSuccess: () => {
      setAddOpen(false);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const revokeMutation = api.dealer.revokePartner.useMutation({
    onSuccess: () => {
      setRevokeId(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const revokeTarget = partners.find((p) => p.id === revokeId);

  if (partners.length === 0 && dealers.length === 0) {
    return (
      <Card className="py-6">
        <EmptyState
          icon={Users}
          heading="No dealer partners yet"
          description="Authorize a verified dealer to sell your society's inventory on your behalf."
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              Authorize a dealer
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Authorize dealer</Button>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {partners.map((partner) => (
          <li key={partner.id}>
            <Card className="p-4">
              <PartnerCardContent
                partner={partner}
                onRevoke={
                  partner.status === AuthorizationStatus.ACTIVE
                    ? () => setRevokeId(partner.id)
                    : undefined
                }
              />
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Card>
          <ul className="divide-y divide-border-base">
            {partners.map((partner) => (
              <li
                key={partner.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <PartnerCardContent
                  partner={partner}
                  onRevoke={
                    partner.status === AuthorizationStatus.ACTIVE
                      ? () => setRevokeId(partner.id)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authorize a dealer</DialogTitle>
            <DialogDescription>
              Grant a dealer permission to sell your inventory. You can scope
              authorization to one category or all categories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dealer">Dealer</Label>
              <Select value={dealerId} onValueChange={setDealerId}>
                <SelectTrigger id="dealer" className="mt-1.5">
                  <SelectValue placeholder="Select dealer" />
                </SelectTrigger>
                <SelectContent>
                  {dealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.agencyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category scope</Label>
              <Select value={categoryScope} onValueChange={setCategoryScope}>
                <SelectTrigger id="category" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="commission">Commission split (%)</Label>
              <Input
                id="commission"
                className="mt-1.5"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setError(null);
                authorizeMutation.mutate({
                  societyId,
                  dealerId,
                  categoryId:
                    categoryScope === "all" ? null : categoryScope,
                  commissionSplitPct: commission,
                });
              }}
              disabled={authorizeMutation.isPending || !dealerId}
            >
              {authorizeMutation.isPending ? "Authorizing…" : "Authorize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeId !== null} onOpenChange={(open) => !open && setRevokeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke dealer authorization</DialogTitle>
            <DialogDescription>
              {revokeTarget
                ? `This will revoke ${revokeTarget.dealer.agencyName}'s authorization to sell your inventory. They will no longer appear as an approved partner.`
                : "Revoke this dealer's authorization."}
            </DialogDescription>
          </DialogHeader>
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeMutation.isPending || revokeId === null}
              onClick={() => {
                if (revokeId === null) return;
                setError(null);
                revokeMutation.mutate({ authorizationId: revokeId });
              }}
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke authorization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PartnerCardContent({
  partner,
  onRevoke,
}: {
  partner: PartnerRow;
  onRevoke?: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold text-text-primary">
          {partner.dealer.agencyName}
        </p>
        <p className="font-sans text-xs text-text-tertiary">
          {partner.categoryLabel ?? "All categories"} ·{" "}
          {partner.commissionSplitPct}% commission
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge
            variant={
              partner.status === AuthorizationStatus.ACTIVE
                ? "success"
                : "neutral"
            }
          >
            {partner.status === AuthorizationStatus.ACTIVE
              ? "Active"
              : "Revoked"}
          </StatusBadge>
          {partner.dealer.dnfbpVerified ? (
            <TrustBadge variant="dnfbp" />
          ) : (
            <StatusBadge variant="warning">DNFBP pending</StatusBadge>
          )}
        </div>
      </div>
      {onRevoke ? (
        <Button variant="ghost" size="sm" onClick={onRevoke}>
          Revoke
        </Button>
      ) : null}
    </div>
  );
}
