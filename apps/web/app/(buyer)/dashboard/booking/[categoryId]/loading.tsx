import { Card, CardContent, CardHeader, Skeleton } from "@sectoria/ui";

export default function BookingWizardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="h-7 w-72" />
      <Skeleton className="mb-6 mt-2 h-4 w-64" />
      <Skeleton className="mb-6 h-7 w-full max-w-xl" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-32 self-end" />
        </CardContent>
      </Card>
    </div>
  );
}
