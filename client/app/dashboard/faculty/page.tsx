"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Check,
  X,
  Eye,
  RefreshCw,
  Filter,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  StatCardSkeleton,
  ListSkeleton,
  TeamProgressSkeleton,
} from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  mentorAllocationApi,
  projectTopicsApi,
  reviewsApi,
} from "@/lib/api";
import { MentorAllocation, Profile, Group, TeamProgress } from "@/types";
import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";

interface AllocationWithDetails extends MentorAllocation {
  group?: Group;
  members?: Profile[];
}

export default function FacultyDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [allocations, setAllocations] = useState<AllocationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamProgress, setTeamProgress] = useState<TeamProgress[]>([]);

  // Semester filter state
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!user || !profile) {
      router.push("/auth/login");
      return;
    }

    if (profile.role !== "faculty" && profile.role !== "super_admin") {
      router.push("/dashboard");
      return;
    }

    loadAllocations();
  }, [user, profile, router, authLoading]);

  const loadAllocations = useCallback(
    async (forceRefresh = false) => {
      if (!profile) return;

      if (!forceRefresh) {
        // Show cached data immediately (if any) so we're never rendering an
        // empty state for content the user has already seen.
        const cachedAllocations = getCachedData<AllocationWithDetails[]>(
          CACHE_KEYS.ALLOCATIONS,
        );
        const cachedTeamProgress = getCachedData<TeamProgress[]>(
          CACHE_KEYS.TEAM_PROGRESS,
        );

        if (cachedAllocations && cachedTeamProgress) {
          setAllocations(cachedAllocations);
          setTeamProgress(cachedTeamProgress);
          setInitialLoading(false);
        }
      } else {
        setRefreshing(true);
      }

      try {
        const mentorAllocations = await mentorAllocationApi.getForMentor();
        // Transform allocations to include flat members array
        const transformedAllocations: AllocationWithDetails[] =
          mentorAllocations.map((allocation: any) => ({
            ...allocation,
            members:
              allocation.group?.members?.map((m: any) => m.profile) || [],
          }));

        // Sort: pending first, then by preference rank
        transformedAllocations.sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return a.preferenceRank - b.preferenceRank;
        });

        // Build team progress from accepted allocations
        const acceptedAllocations = transformedAllocations.filter(
          (a) => a.status === "accepted",
        );

        // Load review rollouts once, in parallel
        let review1Rolled = false;
        let review2Rolled = false;
        let finalReviewRolled = false;

        try {
          const [r1, r2, fr] = await Promise.all([
            reviewsApi.getRollout("review_1"),
            reviewsApi.getRollout("review_2"),
            reviewsApi.getRollout("final_review"),
          ]);

          review1Rolled = !!r1?.isActive;
          review2Rolled = !!r2?.isActive;
          finalReviewRolled = !!fr?.isActive;
        } catch (error) {
          console.error("Failed to load review rollouts:", error);
        }

        // Fetch topics + review sessions for every accepted team in parallel
        // instead of one-team-at-a-time (was the main source of slow loads).
        const progressResults = await Promise.all(
          acceptedAllocations.map(async (allocation) => {
            if (!allocation.group) return null;
            const group = allocation.group;

            const [topics, r1Session, r2Session, frSession] =
              await Promise.all([
                projectTopicsApi.getTopicsByGroupId(group.id).catch(() => []),
                reviewsApi
                  .getSessionByGroupId("review_1", group.id)
                  .catch(() => null),
                reviewsApi
                  .getSessionByGroupId("review_2", group.id)
                  .catch(() => null),
                reviewsApi
                  .getSessionByGroupId("final_review", group.id)
                  .catch(() => null),
              ]);

            const approvedTopic = topics.find((t) => t.status === "approved");

            const team: TeamProgress = {
              groupId: group.id,
              groupDisplayId: group.groupId,
              mentorId: profile.id,
              mentorName: profile.name,
              topicApproval: {
                status: approvedTopic
                  ? "approved"
                  : topics.length > 0
                    ? "pending"
                    : "pending",
                approvedTopic: approvedTopic?.title,
                totalTopicsSubmitted: topics.length,
              },
              review1: {
                status: r1Session?.status || "not_started",
                progressPercentage: r1Session?.progressPercentage || 0,
                isRolledOut: review1Rolled,
              },
              review2: {
                status: r2Session?.status || "not_started",
                progressPercentage: r2Session?.progressPercentage || 0,
                isRolledOut: review2Rolled,
              },
              finalReview: {
                status: frSession?.status || "not_started",
                progressPercentage: frSession?.progressPercentage || 0,
                isRolledOut: finalReviewRolled,
              },
            };
            return team;
          }),
        );

        const progress = progressResults.filter(
          (t): t is TeamProgress => t !== null,
        );

        // Apply both together so the stats/team list and the progress
        // section update in the same render instead of one lagging behind
        // the other (was visible as a stale-then-fresh flash on cached
        // loads).
        setAllocations(transformedAllocations);
        setTeamProgress(progress);
        setCachedData(
          CACHE_KEYS.ALLOCATIONS,
          transformedAllocations,
          CACHE_TTL.MEDIUM,
        );
        setCachedData(CACHE_KEYS.TEAM_PROGRESS, progress, CACHE_TTL.MEDIUM);
      } catch (error) {
        console.error("Failed to load allocations:", error);
        showToast("Failed to load mentor allocations", "error");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [profile, showToast],
  );

  const handleRefresh = () => {
    invalidateCache(CACHE_KEYS.ALLOCATIONS);
    invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
    showToast("Refreshing data...", "info");
    loadAllocations(true);
  };

  const openTeamDialog = (team: TeamProgress) => {
    router.push(`/dashboard/faculty/team/${team.groupId}?tab=topic`);
  };

  const handleAccept = async (allocationId: string) => {
    setLoading(true);
    try {
      await mentorAllocationApi.accept(allocationId);
      showToast("Team accepted successfully!", "success");
      invalidateCache(CACHE_KEYS.ALLOCATIONS);
      invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
      await loadAllocations(true);
    } catch (error: any) {
      showToast(error.message || "Failed to accept team", "error");
      invalidateCache(CACHE_KEYS.ALLOCATIONS);
      invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
      await loadAllocations(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (allocationId: string) => {
    const allocation = allocations.find((a) => a.id === allocationId);
    if (!allocation) {
      showToast("Allocation not found. Refreshing data...", "error");
      invalidateCache(CACHE_KEYS.ALLOCATIONS);
      invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
      await loadAllocations(true);
      return;
    }

    if (allocation.status !== "pending") {
      showToast(
        `Cannot reject this team because status is "${allocation.status}". Refreshing data...`,
        "error",
      );
      invalidateCache(CACHE_KEYS.ALLOCATIONS);
      invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
      await loadAllocations(true);
      return;
    }

    setLoading(true);
    try {
      await mentorAllocationApi.reject(allocationId);
      showToast("Team rejected", "info");
      invalidateCache(CACHE_KEYS.ALLOCATIONS);
      invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
      await loadAllocations(true);
    } catch (error: any) {
      showToast(error.message || "Failed to reject team", "error");
      invalidateCache(CACHE_KEYS.ALLOCATIONS);
      invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
      await loadAllocations(true);
    } finally {
      setLoading(false);
    }
  };

  const getPreferenceLabel = (rank: number) => {
    return (
      ["1st Choice", "2nd Choice", "3rd Choice"][rank - 1] || `${rank}th Choice`
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  const acceptedTeams = allocations.filter((a) => a.status === "accepted");
  const pendingRequests = allocations.filter((a) => a.status === "pending");
  const rejectedRequests = allocations.filter((a) => a.status === "rejected");
  const waitingRequests = allocations.filter((a) => a.status === "waiting");
  // console.log("Allocations:", waitingRequests);

  // Get unique semesters from all accepted teams
  const availableSemesters = React.useMemo(() => {
    const semesters = new Set<number>();
    acceptedTeams.forEach((allocation) => {
      allocation.members?.forEach((member: any) => {
        if (member.semester) {
          semesters.add(member.semester);
        }
      });
    });
    return Array.from(semesters).sort((a, b) => a - b);
  }, [acceptedTeams]);

  // Filter teams by semester
  const filteredAcceptedTeams = React.useMemo(() => {
    if (semesterFilter === null) {
      return acceptedTeams;
    }
    return acceptedTeams.filter((allocation) =>
      allocation.members?.some(
        (member: any) => member.semester === semesterFilter,
      ),
    );
  }, [acceptedTeams, semesterFilter]);

  const filteredTeamProgress = React.useMemo(() => {
    if (semesterFilter === null) {
      return teamProgress;
    }
    // Filter by groupIds that are in filtered accepted teams
    const filteredGroupIds = new Set(
      filteredAcceptedTeams.map((a) => a.group?.id),
    );
    return teamProgress.filter((tp) => filteredGroupIds.has(tp.groupId));
  }, [teamProgress, filteredAcceptedTeams, semesterFilter]);

  const progressByGroup = React.useMemo(() => {
    const map = new Map<string, TeamProgress>();
    teamProgress.forEach((tp) => map.set(tp.groupId, tp));
    return map;
  }, [teamProgress]);

  const firstName = profile?.name?.split(" ")[0] || "";

  const stats = [
    { label: "Active teams", value: acceptedTeams.length, tone: "text-gray-900" },
    {
      label: "Awaiting your reply",
      value: pendingRequests.length,
      tone: pendingRequests.length > 0 ? "text-amber-600" : "text-gray-900",
    },
    { label: "Declined", value: rejectedRequests.length, tone: "text-gray-900" },
    { label: "Total requests", value: allocations.length, tone: "text-gray-900" },
  ];

  const renderMembers = (members?: Profile[]) => (
    <div className="flex flex-wrap gap-2">
      {members?.map((member) => (
        <span
          key={member.id}
          className="inline-flex items-center gap-2 rounded-full bg-gray-100 py-1 pl-1 pr-3 text-sm text-gray-700"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {member.name?.charAt(0).toUpperCase()}
          </span>
          {member.name}
          <span className="text-xs text-gray-500">{member.rollNumber}</span>
        </span>
      ))}
    </div>
  );

  const renderStage = (
    label: string,
    stage: { status: string; progressPercentage?: number; isRolledOut: boolean },
  ) => {
    const done = stage.status === "completed";
    const started = stage.status !== "not_started";
    const locked = !stage.isRolledOut && !started;
    const pct = done ? 100 : stage.progressPercentage || 0;
    return (
      <div key={label} className="min-w-0">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700">{label}</span>
          <span
            className={
              done
                ? "font-medium text-green-700"
                : locked
                  ? "text-gray-400"
                  : "text-gray-500"
            }
          >
            {done ? "Done" : locked ? "Not open" : `${pct}%`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const renderRequestCard = (
    allocation: AllocationWithDetails,
    actionable: boolean,
  ) => (
    <div
      key={allocation.id}
      className={`rounded-xl border bg-white p-4 ${actionable ? "border-amber-200" : "border-gray-200"}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {allocation.group?.groupId || "Unknown group"}
          </h3>
          <p className="text-sm text-gray-500">
            Team code {allocation.group?.teamCode}
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          {getPreferenceLabel(allocation.preferenceRank)}
        </span>
      </div>
      {renderMembers(allocation.members)}
      {actionable && (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => handleAccept(allocation.id)}
            disabled={loading}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <Check className="mr-2 h-4 w-4" />
            Accept team
          </Button>
          <Button
            onClick={() => handleReject(allocation.id)}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <X className="mr-2 h-4 w-4" />
            Decline
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout title="Faculty Dashboard">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </h2>
            <p className="text-sm text-gray-500">
              {initialLoading
                ? "Loading your teams..."
                : pendingRequests.length > 0
                  ? `${pendingRequests.length} team${pendingRequests.length > 1 ? "s are" : " is"} waiting for your reply.`
                  : "No requests are waiting for your reply."}
            </p>
          </div>
          <div className="flex gap-2">
            {profile?.role === "super_admin" && (
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/admin")}
                size="sm"
              >
                Admin dashboard
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleRefresh}
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {initialLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <ListSkeleton items={3} />
            <div className="space-y-3">
              <TeamProgressSkeleton />
              <TeamProgressSkeleton />
            </div>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200 bg-white md:grid-cols-4 md:divide-x md:divide-gray-200">
              {stats.map((s) => (
                <div key={s.label} className="px-5 py-4">
                  <dd className={`text-3xl font-semibold ${s.tone}`}>
                    {s.value}
                  </dd>
                  <dt className="mt-1 text-sm text-gray-500">{s.label}</dt>
                </div>
              ))}
            </dl>

            {pendingRequests.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Needs your reply ({pendingRequests.length})
                </h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {pendingRequests.map((a) => renderRequestCard(a, true))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  My teams
                </h3>
                {availableSemesters.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filter by semester</span>
                    <select
                      value={semesterFilter ?? ""}
                      onChange={(e) =>
                        setSemesterFilter(
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="rounded-md border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">All semesters</option>
                      {availableSemesters.map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {acceptedTeams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="font-medium text-gray-800">No teams yet</p>
                  <p className="text-sm text-gray-500">
                    {allocations.length === 0
                      ? "Teams appear here once students choose you as a mentor."
                      : "Accept a request to start mentoring a team."}
                  </p>
                </div>
              ) : filteredAcceptedTeams.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-white py-8 text-center text-gray-500">
                  No teams in semester {semesterFilter}.
                </p>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {filteredAcceptedTeams.map((allocation) => {
                    const tp = allocation.group
                      ? progressByGroup.get(allocation.group.id)
                      : undefined;
                    const topic = tp?.topicApproval;
                    return (
                      <div
                        key={allocation.id}
                        className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-indigo-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900">
                              {allocation.group?.groupId || "Unknown group"}
                            </h4>
                            <p
                              className={`truncate text-sm ${topic?.approvedTopic ? "text-gray-700" : "text-gray-400"}`}
                              title={topic?.approvedTopic}
                            >
                              {topic?.approvedTopic ||
                                (topic && topic.totalTopicsSubmitted > 0
                                  ? `${topic.totalTopicsSubmitted} topic${topic.totalTopicsSubmitted > 1 ? "s" : ""} awaiting approval`
                                  : "No topic submitted yet")}
                            </p>
                          </div>
                          {tp && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openTeamDialog(tp)}
                              className="shrink-0 gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Open
                            </Button>
                          )}
                        </div>

                        {renderMembers(allocation.members)}

                        {tp && (
                          <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                            {renderStage("Review 1", tp.review1)}
                            {renderStage("Review 2", tp.review2)}
                            {renderStage("Final", tp.finalReview)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {waitingRequests.length > 0 && (
              <details className="rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer select-none px-4 py-3 font-medium text-gray-800">
                  Unavailable requests ({waitingRequests.length})
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    These teams were placed with another mentor.
                  </span>
                </summary>
                <div className="grid gap-3 border-t border-gray-100 p-4 lg:grid-cols-2">
                  {waitingRequests.map((a) => renderRequestCard(a, false))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
