export default function MentorCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex justify-between gap-4">
        <div className="flex-1">
          {/* Name */}
          <div className="mb-3 h-6 w-44 rounded-md bg-gray-200" />

          {/* Email */}
          <div className="mb-2 h-4 w-64 rounded bg-gray-200" />

          {/* Department */}
          <div className="mb-4 h-3 w-36 rounded bg-gray-200" />

          {/* Domains */}
          <div className="flex flex-wrap gap-2">
            <div className="h-7 w-20 rounded-full bg-gray-200" />
            <div className="h-7 w-24 rounded-full bg-gray-200" />
            <div className="h-7 w-16 rounded-full bg-gray-200" />
          </div>
        </div>

        {/* Check icon placeholder */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}