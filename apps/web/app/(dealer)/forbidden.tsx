import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button, EmptyState } from "@sectoria/ui";

/** Rendered when a dealer hits a route they cannot access. */
export default function DealerForbidden() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <EmptyState
        icon={ShieldX}
        heading="Access denied"
        description="You don't have permission to view this page. Dealer partners only see their own profile, leads, and verification status."
        action={
          <Button asChild>
            <Link href="/dealer-portal">Back to your portal</Link>
          </Button>
        }
      />
    </div>
  );
}
