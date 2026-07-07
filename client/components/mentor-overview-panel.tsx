"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { MentorOverview, MentorGroupInfo, ReviewStatus } from "@/types";

interface MentorOverviewPanelProps {
  mentors: MentorOverview[];
  loading?: boolean;
  semesterFilter?: number | null;
  onSemesterFilterChange?: (semester: number | null) => void;
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

function MentorCard({ mentor }: { mentor: MentorOverview }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card className="mb-4">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
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
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {domain.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-primary">
                <Users className="h-4 w-4" />
                <span className="font-bold text-lg">{mentor.totalGroups}</span>
              </div>
              <span className="text-xs text-gray-500">
                {mentor.totalGroups === 1 ? "Group" : "Groups"}
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
        <CardContent className="border-t pt-4">
          {mentor.assignedGroups.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No groups assigned
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-gray-600">Group</th>
                    <th className="pb-2 font-medium text-gray-600">Leader</th>
                    <th className="pb-2 font-medium text-gray-600 w-20">Members</th>
                    <th className="pb-2 font-medium text-gray-600 w-28">Topic</th>
                    <th className="pb-2 font-medium text-gray-600 text-center w-16">
                      R1
                    </th>
                    <th className="pb-2 font-medium text-gray-600 text-center w-16">
                      R2
                    </th>
                    <th className="pb-2 font-medium text-gray-600 text-center w-16">
                      Final
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mentor.assignedGroups.map((group) => (
                    <GroupRow key={group.id} group={group} />
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

function GroupRow({ group }: { group: MentorGroupInfo }) {
  const [showMembers, setShowMembers] = React.useState(false);

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-3">
          <div className="font-medium">{group.groupId}</div>
          <div className="text-xs text-gray-400 font-mono">{group.teamCode}</div>
        </td>
        <td className="py-3">{group.leaderName}</td>
        <td className="py-3">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Users className="h-3 w-3" />
            {group.memberCount}
          </button>
        </td>
        <td className="py-3">
          <div className="flex flex-col gap-1">
            {getTopicStatusBadge(group.topicStatus)}
            {group.approvedTopicTitle && (
              <span
                className="text-xs text-gray-600 truncate max-w-[150px]"
                title={group.approvedTopicTitle}
              >
                {group.approvedTopicTitle}
              </span>
            )}
          </div>
        </td>
        <td className="py-3 text-center">
          {getReviewStatusBadge(group.review1Status, group.review1Progress)}
        </td>
        <td className="py-3 text-center">
          {getReviewStatusBadge(group.review2Status, group.review2Progress)}
        </td>
        <td className="py-3 text-center">
          {getReviewStatusBadge(
            group.finalReviewStatus,
            group.finalReviewProgress,
          )}
        </td>
      </tr>
      {showMembers && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-4 py-2">
            <div className="text-xs">
              <span className="font-medium text-gray-600">Team Members:</span>
              <ul className="mt-1 space-y-1">
                {group.members.map((member) => (
                  <li key={member.id} className="flex items-center gap-2">
                    <span>{member.name}</span>
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
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p>Loading mentor overview...</p>
          </div>
        </CardContent>
      </Card>
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
        <div className="flex items-center gap-2 justify-end">
          <Filter className="h-4 w-4 text-gray-500" />
          <label className="text-sm text-gray-600">Filter by Semester:</label>
          <select
            value={semesterFilter ?? ""}
            onChange={(e) => onSemesterFilterChange(e.target.value ? parseInt(e.target.value) : null)}
            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{filteredMentors.length}</div>
          <div className="text-sm text-gray-500">Active Mentors</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{totalGroups}</div>
          <div className="text-sm text-gray-500">Assigned Groups</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {filteredMentors
              .flatMap((m) => m.assignedGroups)
              .filter((g) => g.topicStatus === "approved").length}
          </div>
          <div className="text-sm text-gray-500">Topics Approved</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {filteredMentors
              .flatMap((m) => m.assignedGroups)
              .filter((g) => g.finalReviewStatus === "completed").length}
          </div>
          <div className="text-sm text-gray-500">Projects Completed</div>
        </div>
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
            <MentorCard key={mentor.id} mentor={mentor} />
          ))
        )}
      </div>
    </div>
  );
}
