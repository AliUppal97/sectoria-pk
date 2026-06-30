import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button, EmptyState } from "@sectoria/ui";

/**
 * Rendered by Next.js when `forbidden()` is called — e.g. a society admin
 * tampering with another society's id in the URL.
 */
export default function SocietyForbidden() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <EmptyState
        icon={ShieldX}
        heading="Access denied"
        description="You don't have permission to view this society's data. You'll only see bookings, inventory, and settings for the society you administer."
        action={
          <Button asChild>
            <Link href="/society-portal">Back to your portal</Link>
          </Button>
        }
      />
    </div>
  );
}
