import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard-layout";

export function FacultyTeamPageSkeleton() {
  return (
    <DashboardLayout title="Faculty Team">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
         {/* Top Actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-44 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      {/* Group Header */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>

          <div className="space-y-2 text-right">
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="ml-auto h-5 w-56" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg border">
        <div className="grid grid-cols-4 gap-2 border-b p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>

        <div className="space-y-5 p-5">
          {/* Section Header */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          <Skeleton className="h-4 w-80" />

          {/* Uploaded File */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-md" />

              <div className="space-y-2">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>

            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </div>

      {/* Approval Message */}
      <div className="rounded-lg border p-5 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Submitted Topics */}
      <div className="rounded-lg border p-5">
        <Skeleton className="mb-6 h-7 w-48" />

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start justify-between rounded-lg border p-4"
            >
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-80" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              <div className="ml-6 flex items-center gap-3">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-9 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}