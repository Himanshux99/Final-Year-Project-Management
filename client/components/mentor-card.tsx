import { Check } from "lucide-react";

interface MentorCardProps {
  mentor: any;
  isSelected: boolean;
  preferenceNum: number | null;
  onSelect: (id: string) => void;
}

export default function MentorCard({
  mentor,
  isSelected,
  preferenceNum,
  onSelect,
}: MentorCardProps) {
  return (
    <button
      onClick={() => onSelect(mentor.id)}
      className={`group w-full rounded-2xl border bg-white p-5 transition-all duration-300
  ${
    isSelected
      ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/10"
      : "border-gray-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
  }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Section */}
        <div className="min-w-0 flex-1">
          {/* Name + Coordinator */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-gray-900">
              {mentor.name}
            </h3>

            {mentor.role === "super_admin" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Coordinator
              </span>
            )}
          </div>

          {/* Email + Department */}
          <div className="mt-1 flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="truncate">{mentor.email}</span>

            <span className="hidden sm:block text-gray-300">•</span>

            <span className="font-medium text-gray-500">
              {mentor.department}
            </span>
          </div>

          {/* Domains */}
          {mentor.domains && (
            <div className="mt-4 flex flex-wrap gap-2">
              {mentor.domains.split(",").map((domain: string, i: number) => (
                <span
                  key={i}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors group-hover:bg-indigo-100"
                >
                  {domain.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Section */}
        {isSelected && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-2 lg:flex-col lg:justify-center lg:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow">
              <Check className="h-5 w-5 text-white" />
            </div>

            <span className="whitespace-nowrap text-sm font-semibold text-primary">
              {preferenceNum === 1
                ? "1st Choice"
                : preferenceNum === 2
                  ? "2nd Choice"
                  : "3rd Choice"}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
