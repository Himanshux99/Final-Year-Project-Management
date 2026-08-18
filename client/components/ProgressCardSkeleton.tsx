import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "./ui/card";

export function ProgressCardSkeleton({
  showButton = true,
}: {
  showButton?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />

          {showButton && <Skeleton className="h-9 w-36 rounded-md" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-[100px] w-[100px] rounded-full" />

          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full rounded-[1px]" />
          </div>
        </div>

        {/* Progress Description */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />

          <div className="rounded-md border bg-muted/20 p-3 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          <Skeleton className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}