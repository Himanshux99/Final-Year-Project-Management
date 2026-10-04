"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Search,
  TrendingUp,
  Users,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { ListSkeleton, StatTilesSkeleton } from "./ui/skeleton";
import { ReviewEvaluation, ReviewType } from "@/types";

interface EvaluationsPanelProps {
  evaluations: ReviewEvaluation[];
  loading?: boolean;
}

const REVIEW_LABELS: Record<ReviewType, string> = {
  review_1: "Review 1",
  review_2: "Review 2",
  final_review: "Final Review",
};

const REVIEW_BADGE: Record<ReviewType, string> = {
  review_1: "border-sky-200 bg-sky-50 text-sky-700",
  review_2: "border-violet-200 bg-violet-50 text-violet-700",
  final_review: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

// Criteria columns shown in the per-student table, with max marks.
const R1_CRITERIA = [
  { key: "progressMarks", label: "Progress", max: 10 },
  { key: "contributionMarks", label: "Contribution", max: 10 },
  { key: "publicationMarks", label: "Publication", max: 5 },
] as const;

const R2_CRITERIA = [
  { key: "techUsageMarks", label: "Tech Usage", max: 5 },
  { key: "innovationMarks", label: "Innovation", max: 5 },
  { key: "presentationMarks", label: "Presentation", max: 5 },
  { key: "activityMarks", label: "Activity", max: 5 },
  { key: "synopsisMarks", label: "Synopsis", max: 5 },
] as const;

function completionColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-rose-400";
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none text-gray-900">
          {value}
        </div>
        <div className="mt-1 text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: ReviewEvaluation }) {
  const [expanded, setExpanded] = React.useState(false);

  const isReview1 = evaluation.reviewType === "review_1";
  const criteria = isReview1 ? R1_CRITERIA : R2_CRITERIA;
  const maxTotal = criteria.reduce((sum, c) => sum + c.max, 0);
  const grades = Array.isArray(evaluation.studentGrades)
    ? evaluation.studentGrades
    : [];
  const completion = evaluation.completionPercentage ?? 0;
  const paperStatus = (evaluation as any).paperPublicationStatus as
    | string
    | undefined;

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full p-4 text-left transition-colors hover:bg-indigo-50/30"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900">
                {evaluation.group?.groupId || "Group"}
              </h4>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  REVIEW_BADGE[evaluation.reviewType] ??
                  "border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                {REVIEW_LABELS[evaluation.reviewType] ?? "Review"}
              </span>
              {evaluation.group?.teamCode && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500">
                  {evaluation.group.teamCode}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-gray-700">
              {evaluation.projectTitle || "Untitled project"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Evaluated by{" "}
              <span className="font-medium text-gray-700">
                {evaluation.mentor?.name || "Unknown"}
              </span>
              {evaluation.filledAt &&
                ` • ${new Date(evaluation.filledAt).toLocaleDateString()}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="w-28 sm:w-40">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-500">Completion</span>
                <span className="font-semibold text-gray-800">
                  {completion}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${completionColor(completion)}`}
                  style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                />
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <CardContent className="space-y-5 border-t bg-gray-50/50 pt-4">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Detail label="Division" value={evaluation.division} />
            <Detail label="Project Guide" value={evaluation.projectGuide} />
            {isReview1 ? (
              <>
                <Detail
                  label="Category"
                  value={evaluation.projectCategory}
                />
                <Detail label="Project Type" value={evaluation.projectType} />
              </>
            ) : (
              <>
                <Detail label="Domain" value={evaluation.projectDomain} />
                <Detail label="Quality Grade" value={evaluation.qualityGrade} />
                <Detail
                  label="Nature of Project"
                  value={evaluation.projectNature}
                />
              </>
            )}
            {paperStatus && (
              <Detail label="Paper Status" value={paperStatus} />
            )}
          </dl>

          {evaluation.remarks && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Remarks
              </p>
              <p className="mt-1 text-sm text-gray-800">{evaluation.remarks}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">
              Student Marks
            </p>
            {grades.length === 0 ? (
              <p className="text-sm text-gray-500">No student grades.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2.5 font-semibold">Student</th>
                      {criteria.map((c) => (
                        <th
                          key={c.key}
                          className="px-3 py-2.5 text-center font-semibold"
                        >
                          {c.label}
                          <span className="ml-1 font-normal text-gray-400">
                            /{c.max}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-center font-semibold">
                        Total
                        <span className="ml-1 font-normal text-gray-400">
                          /{maxTotal}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((grade) => {
                      const total =
                        grade.totalMarks ??
                        criteria.reduce(
                          (sum, c) => sum + ((grade as any)[c.key] ?? 0),
                          0,
                        );
                      return (
                        <tr
                          key={grade.id}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-gray-900">
                              {grade.student?.name ||
                                grade.studentName ||
                                "Unknown Student"}
                            </div>
                            {(grade.student?.rollNumber ||
                              grade.rollNumber) && (
                              <div className="font-mono text-[11px] text-gray-500">
                                {grade.student?.rollNumber || grade.rollNumber}
                              </div>
                            )}
                          </td>
                          {criteria.map((c) => (
                            <td
                              key={c.key}
                              className="px-3 py-2.5 text-center text-gray-700"
                            >
                              {(grade as any)[c.key] ?? 0}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-center">
                            <Badge
                              variant={
                                total / maxTotal >= 0.6 ? "success" : "warning"
                              }
                            >
                              {total}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function EvaluationsPanel({ evaluations, loading }: EvaluationsPanelProps) {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | ReviewType>("all");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return evaluations
      .filter((e) => typeFilter === "all" || e.reviewType === typeFilter)
      .filter((e) => {
        if (!q) return true;
        const haystack = [
          e.group?.groupId,
          e.group?.teamCode,
          e.mentor?.name,
          e.projectTitle,
          ...(e.studentGrades ?? []).map(
            (g) => g.student?.name || g.studentName,
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.filledAt).getTime() - new Date(a.filledAt).getTime(),
      );
  }, [evaluations, search, typeFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <StatTilesSkeleton count={4} />
        <ListSkeleton items={3} />
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No evaluations submitted yet.</p>
            <p className="mt-1 text-sm">
              They will appear here once mentors submit review evaluations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgCompletion = Math.round(
    evaluations.reduce((sum, e) => sum + (e.completionPercentage ?? 0), 0) /
      evaluations.length,
  );
  const groupsEvaluated = new Set(evaluations.map((e) => e.groupId)).size;
  const studentsGraded = evaluations.reduce(
    (sum, e) => sum + (e.studentGrades?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          icon={ClipboardCheck}
          value={evaluations.length}
          label="Evaluations"
          tone="bg-indigo-50 text-indigo-600"
        />
        <SummaryTile
          icon={FileText}
          value={groupsEvaluated}
          label="Groups Evaluated"
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryTile
          icon={Users}
          value={studentsGraded}
          label="Student Grades"
          tone="bg-sky-50 text-sky-600"
        />
        <SummaryTile
          icon={TrendingUp}
          value={`${avgCompletion}%`}
          label="Avg. Completion"
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by group, evaluator, project or student"
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | ReviewType)}
          className="sm:w-48"
        >
          <option value="all">All reviews</option>
          <option value="review_1">Review 1</option>
          <option value="review_2">Review 2</option>
          <option value="final_review">Final Review</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              No evaluations match your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((evaluation) => (
            <EvaluationCard key={evaluation.id} evaluation={evaluation} />
          ))}
        </div>
      )}
    </div>
  );
}
