import Link from "next/link";
import { Compass } from "lucide-react";
import { Button, EmptyState } from "@sectoria/ui";

/**
 * Styled 404 within the marketplace chrome — never a bare unstyled page
 * (routing-and-navigation.mdc). Always offers a path back into the app.
 */
export default function MarketplaceNotFound() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-24 sm:px-6">
      <EmptyState
        icon={Compass}
        heading="We couldn't find that page"
        description="The society, category, or dealer you're looking for may have moved or is no longer listed."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="sm">
              <Link href="/societies">Browse societies</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
