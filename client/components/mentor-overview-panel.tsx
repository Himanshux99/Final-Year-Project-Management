"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle,
  Filter,
  ArrowRight,
  FolderCheck,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  MentorCardSkeleton,
  StatTilesSkeleton,
} from "./ui/skeleton";
import { MentorOverview, MentorGroupInfo, ReviewStatus } from "@/types";

interface MentorOverviewPanelProps {
  mentors: MentorOverview[];
  loading?: boolean;
  semesterFilter?: number | null;
  onSemesterFilterChange?: (semester: number | null) => void;
  // When set, each group row gets a button that opens the team workspace.
  onOpenTeam?: (groupDbId: string) => void;
}

function getTopicStatusBadge(status: MentorGroupInfo["topicStatus"]) {
  switch (status) {
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    case "pending":
    case "submitted":
    case "under_review":
      return <Badge variant="warning">Pending</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "revision_requested":
      return <Badge variant="secondary">Revision</Badge>;
    default:
      return <Badge variant="outline">Not Submitted</Badge>;
  }
}

function getReviewStatusBadge(
  status: ReviewStatus | null,
  progress: number | null,
) {
  if (!status || status === "not_started") {
    return <span className="text-gray-400">—</span>;
  }

  switch (status) {
    case "completed":
      return (
        <Badge variant="success" className="text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Done
        </Badge>
      );
    case "feedback_given":
      return (
        <Badge variant="secondary" className="text-xs">
          Feedback
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="outline" className="text-xs">
          {progress || 0}%
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="warning" className="text-xs">
          {progress || 0}%
        </Badge>
      );
    default:
      return <span className="text-gray-400">—</span>;
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function StatTile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  tone: "indigo" | "green" | "amber" | "blue";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
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

function MentorCard({
  mentor,
  onOpenTeam,
}: {
  mentor: MentorOverview;
  onOpenTeam?: (groupDbId: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card className="mb-4 overflow-hidden border-gray-200 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader
        className="cursor-pointer select-none transition-colors hover:bg-indigo-50/40"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-semibold text-white shadow-sm">
              {getInitials(mentor.name) || "?"}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {mentor.name}
              </CardTitle>
              <p className="text-sm text-gray-500">{mentor.email}</p>
              {mentor.domains && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {mentor.domains.split(",").map((domain, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                    >
                      {domain.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-indigo-700">
              <Users className="h-4 w-4" />
              <span className="text-lg font-bold leading-none">
                {mentor.totalGroups}
              </span>
              <span className="text-xs">
                {mentor.totalGroups === 1 ? "group" : "groups"}
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t bg-gray-50/50 pt-4">
          {mentor.assignedGroups.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No groups assigned
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide">
                    {[
                      { label: "Group", w: onOpenTeam ? "14%" : "16%", center: false },
                      { label: "Leader", w: onOpenTeam ? "18%" : "20%", center: false },
                      { label: "Members", w: onOpenTeam ? "10%" : "12%", center: true },
                      { label: "Topic", w: onOpenTeam ? "14%" : "16%", center: true },
                      { label: "R1", w: onOpenTeam ? "10%" : "12%", center: true },
                      { label: "R2", w: onOpenTeam ? "10%" : "12%", center: true },
                      { label: "Final", w: onOpenTeam ? "10%" : "12%", center: true },
                      ...(onOpenTeam
                        ? [{ label: "", w: "14%", center: true }]
                        : []),
                    ].map((col, i) => (
                      <th
                        key={i}
                        style={{ width: col.w }}
                        className={`px-3 py-2.5 font-semibold text-gray-500 ${
                          col.center ? "text-center" : ""
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mentor.assignedGroups.map((group) => (
                    <GroupRow key={group.id} group={group} onOpenTeam={onOpenTeam} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function GroupRow({
  group,
  onOpenTeam,
}: {
  group: MentorGroupInfo;
  onOpenTeam?: (groupDbId: string) => void;
}) {
  const [showMembers, setShowMembers] = React.useState(false);

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 transition-colors hover:bg-indigo-50/30">
        <td className="px-3 py-3">
          <div className="font-medium">{group.groupId}</div>
          {/* <div className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500">{group.teamCode}</div> */}
        </td>
        <td className="px-3 py-3 text-gray-700">{group.leaderName}</td>
        <td className="px-3 py-3 text-center">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            <Users className="h-3 w-3" />
            {group.memberCount}
          </button>
        </td>
        <td className="px-3 py-3 text-center">
          {getTopicStatusBadge(group.topicStatus)}
        </td>
        <td className="px-3 py-3 text-center">
          {getReviewStatusBadge(group.review1Status, group.review1Progress)}
        </td>
        <td className="px-3 py-3 text-center">
          {getReviewStatusBadge(group.review2Status, group.review2Progress)}
        </td>
        <td className="px-3 py-3 text-center">
          {getReviewStatusBadge(
            group.finalReviewStatus,
            group.finalReviewProgress,
          )}
        </td>
        {onOpenTeam && (
          <td className="px-3 py-3 text-center">
            <button
              onClick={() => onOpenTeam(group.id)}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
            >
              Open team
              <ArrowRight className="h-3 w-3" />
            </button>
          </td>
        )}
      </tr>
      {showMembers && (
        <tr>
          <td colSpan={onOpenTeam ? 8 : 7} className="bg-indigo-50/40 px-4 py-3">
            <div className="text-xs">
              <span className="font-medium text-gray-600">Team Members:</span>
              <ul className="mt-1 space-y-1">
                {group.members.map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-800">{member.name}</span>
                    <span className="text-gray-400">({member.email})</span>
                    {member.rollNumber && (
                      <span className="text-gray-400">
                        - {member.rollNumber}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function MentorOverviewPanel({
  mentors,
  loading,
  semesterFilter,
  onSemesterFilterChange,
  onOpenTeam,
}: MentorOverviewPanelProps) {
  // Get unique semesters from all groups
  const allSemesters = React.useMemo(() => {
    const semesters = new Set<number>();
    mentors.forEach((mentor) => {
      mentor.assignedGroups.forEach((group) => {
        group.members.forEach((member) => {
          if (member.semester) {
            semesters.add(member.semester);
          }
        });
      });
    });
    return Array.from(semesters).sort((a, b) => a - b);
  }, [mentors]);

  // Filter mentors and groups by semester
  const filteredMentors = React.useMemo(() => {
    if (semesterFilter === null || semesterFilter === undefined) {
      return mentors;
    }
    return mentors
      .map((mentor) => ({
        ...mentor,
        assignedGroups: mentor.assignedGroups.filter((group) =>
          group.members.some((member) => member.semester === semesterFilter)
        ),
      }))
      .filter((mentor) => mentor.assignedGroups.length > 0)
      .map((mentor) => ({
        ...mentor,
        totalGroups: mentor.assignedGroups.length,
      }));
  }, [mentors, semesterFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <StatTilesSkeleton />
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <MentorCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No mentors with assigned groups yet.</p>
            <p className="text-sm mt-1">
              Groups will appear here once mentors accept team requests.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalGroups = filteredMentors.reduce((sum, m) => sum + m.totalGroups, 0);

  return (
    <div className="space-y-4">
      {/* Semester Filter */}
      {allSemesters.length > 0 && onSemesterFilterChange && (
        <div className="flex items-center justify-end gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <label className="text-sm font-medium text-gray-600">Semester</label>
          <select
            value={semesterFilter ?? ""}
            onChange={(e) => onSemesterFilterChange(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All Semesters</option>
            {allSemesters.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={GraduationCap}
          value={filteredMentors.length}
          label="Active Mentors"
          tone="indigo"
        />
        <StatTile
          icon={Users}
          value={totalGroups}
          label="Assigned Groups"
          tone="amber"
        />
        <StatTile
          icon={FolderCheck}
          value={
            filteredMentors
              .flatMap((m) => m.assignedGroups)
              .filter((g) => g.topicStatus === "approved").length
          }
          label="Topics Approved"
          tone="green"
        />
        <StatTile
          icon={Trophy}
          value={
            filteredMentors
              .flatMap((m) => m.assignedGroups)
              .filter((g) => g.finalReviewStatus === "completed").length
          }
          label="Projects Completed"
          tone="blue"
        />
      </div>

      {/* Mentor Cards */}
      <div>
        {filteredMentors.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No groups found for Semester {semesterFilter}.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredMentors.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} onOpenTeam={onOpenTeam} />
          ))
        )}
      </div>
    </div>
  );
}
