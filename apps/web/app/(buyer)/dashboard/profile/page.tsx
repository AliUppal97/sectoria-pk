import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  TrustBadge,
  formatDate,
} from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { getCurrentBuyer } from "@/lib/buyer/current-user";
import { atlInfo } from "@/lib/atl";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const buyer = await getCurrentBuyer();
  const atl = atlInfo(buyer.atlStatus);

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your identity and tax verification status."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Name" value={buyer.name} />
            <Field label="Phone" value={buyer.phone} mono />
            <Field
              label="Member since"
              value={formatDate(buyer.createdAt.toISOString())}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity (NADRA)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {buyer.nadraVerified ? (
              <>
                <TrustBadge variant="nadra" />
                <p className="font-sans text-sm text-text-secondary">
                  Your identity is confirmed against NADRA&apos;s CNIC records.
                </p>
                <p className="font-sans text-xs text-text-tertiary">
                  CNIC{" "}
                  {buyer.hasCnicOnFile
                    ? "stored securely (encrypted) — never shown in full."
                    : "on file."}
                </p>
              </>
            ) : (
              <>
                <StatusBadge variant="warning">Not verified</StatusBadge>
                <p className="font-sans text-sm text-text-secondary">
                  You&apos;ll verify your CNIC against NADRA during your first
                  booking. It&apos;s required before any escrow payment.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>FBR tax status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge variant={atl.badgeVariant}>{atl.label}</StatusBadge>
              {buyer.atlVerifiedAt ? (
                <span className="font-sans text-xs text-text-tertiary">
                  Checked {formatDate(buyer.atlVerifiedAt.toISOString())}
                </span>
              ) : null}
            </div>
            <p className="font-sans text-sm text-text-secondary">
              {atl.implication}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-2xs uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </span>
      <span
        className={
          mono
            ? "font-mono text-sm tracking-wider text-text-primary"
            : "font-sans text-sm font-medium text-text-primary"
        }
      >
        {value}
      </span>
    </div>
  );
}
