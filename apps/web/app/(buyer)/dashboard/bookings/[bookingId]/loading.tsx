import { Card, CardContent, CardHeader, Skeleton } from "@sectoria/ui";

export default function BookingDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-4 h-3 w-24" />
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mb-6 mt-2 h-4 w-80" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Skeleton className="h-64 rounded-md" />
      </div>
    </div>
  );
}
