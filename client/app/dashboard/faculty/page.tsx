"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Check,
  X,
  ClipboardList,
  Eye,
  RefreshCw,
  Filter,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StatCardSkeleton,
  ListSkeleton,
  TeamProgressSkeleton,
} from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  mentorAllocationApi,
  groupApi,
  projectTopicsApi,
  reviewsApi,
  topicApprovalApi,
} from "@/lib/api";
import {
  MentorAllocation,
  Profile,
  Group,
  TeamProgress,
  ProjectTopic,
  ReviewSession as ReviewSessionType,
  ReviewType,
} from "@/types";
import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";
import { DeleteTeamButton } from "@/components/delete-team-button";

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
  const [teamProgress, setTeamProgress] = useState<TeamProgress[]>([]);
  // const [selectedTeam, setSelectedTeam] = useState<TeamProgress | null>(null);

  // Semester filter state
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);

  // // Selected team data
  // const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  // const [topics, setTopics] = useState<ProjectTopic[]>([]);
  // const [review1Session, setReview1Session] =
  //   useState<ReviewSessionType | null>(null);
  // const [review2Session, setReview2Session] =
  //   useState<ReviewSessionType | null>(null);
  // const [finalReviewSession, setFinalReviewSession] =
  //   useState<ReviewSessionType | null>(null);

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

      try {
        setInitialLoading(true);

        // Check cache first (unless forced refresh)
        if (!forceRefresh) {
          const cachedAllocations = getCachedData<AllocationWithDetails[]>(
            CACHE_KEYS.ALLOCATIONS,
          );
          const cachedTeamProgress = getCachedData<TeamProgress[]>(
            CACHE_KEYS.TEAM_PROGRESS,
          );

          if (cachedAllocations && cachedTeamProgress) {
            setAllocations(cachedAllocations);
            setTeamProgress(cachedTeamProgress);
            // Show cached data immediately, but continue fetching fresh data in background.
            setInitialLoading(false);
          }
        }

        const mentorAllocations = await mentorAllocationApi.getForMentor();
        console.log("Fetched mentor allocations:", mentorAllocations);
        // Transform allocations to include flat members array
        const transformedAllocations: AllocationWithDetails[] =
          mentorAllocations.map((allocation: any) => ({
            ...allocation,
            members:
              allocation.group?.members?.map((m: any) => m.profile) || [],
          }));
        console.log("Transformed allocations:", transformedAllocations);

        // Sort: pending first, then by preference rank
        transformedAllocations.sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return a.preferenceRank - b.preferenceRank;
        });

        setAllocations(transformedAllocations);
        setCachedData(
          CACHE_KEYS.ALLOCATIONS,
          transformedAllocations,
          CACHE_TTL.MEDIUM,
        );

        // Build team progress from accepted allocations
        const acceptedAllocations = transformedAllocations.filter(
          (a) => a.status === "accepted",
        );
        const progress: TeamProgress[] = [];

        // Load review rollouts once
        let review1Rolled = false;
        let review2Rolled = false;
        let finalReviewRolled = false;

        try {
          const r1 = await reviewsApi.getRollout("review_1");
          const r2 = await reviewsApi.getRollout("review_2");
          const fr = await reviewsApi.getRollout("final_review");

          review1Rolled = !!r1?.isActive;
          review2Rolled = !!r2?.isActive;
          finalReviewRolled = !!fr?.isActive;
        } catch (error) {
          console.error("Failed to load review rollouts:", error);
        }

        for (const allocation of acceptedAllocations) {
          if (!allocation.group) continue;

          // Get topics for this group
          const topics = await projectTopicsApi
            .getTopicsByGroupId(allocation.group.id)
            .catch(() => []);
          const approvedTopic = topics.find((t) => t.status === "approved");

          // Get review sessions for this group
          const [r1Session, r2Session, frSession] = await Promise.all([
            reviewsApi
              .getSessionByGroupId("review_1", allocation.group.id)
              .catch(() => null),
            reviewsApi
              .getSessionByGroupId("review_2", allocation.group.id)
              .catch(() => null),
            reviewsApi
              .getSessionByGroupId("final_review", allocation.group.id)
              .catch(() => null),
          ]);

          progress.push({
            groupId: allocation.group.id,
            groupDisplayId: allocation.group.groupId,
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
          });
        }

        setTeamProgress(progress);
        setCachedData(CACHE_KEYS.TEAM_PROGRESS, progress, CACHE_TTL.MEDIUM);
        setInitialLoading(false);
      } catch (error) {
        console.error("Failed to load allocations:", error);
        showToast("Failed to load mentor allocations", "error");
        setInitialLoading(false);
      }
    },
    [profile, showToast],
  );

  const handleRefresh = () => {
    invalidateCache(CACHE_KEYS.ALLOCATIONS);
    invalidateCache(CACHE_KEYS.TEAM_PROGRESS);
    loadAllocations(true);
    showToast("Refreshing data...", "info");
  };

  // const loadTeamData = useCallback(
  //   async (teamProg: TeamProgress) => {
  //     try {
  //       const group = await groupApi.getById(teamProg.groupId);
  //       setSelectedGroup(group as any); // Cast to handle type mismatch from API

  //       if (group) {
  //         // Load topics and messages via API
  //         const [topicsData, messagesData] = await Promise.all([
  //           projectTopicsApi.getTopicsByGroupId(group.id),
  //           projectTopicsApi.getMessagesByGroupId(group.id),
  //         ]);

  //         console.log("Loaded team data:", {
  //           groupId: group.id,
  //           topicsCount: topicsData.length,
  //           topics: topicsData,
  //           messagesCount: messagesData.length,
  //         });

  //         setTopics(topicsData);
  //         // setTopicMessages(messagesData);

  //         // Load topic approval document
  //         try {
  //           const doc = await topicApprovalApi.getByGroupId(group.id);
  //           // setTopicApprovalDoc(doc);
  //           // setHasTopicApprovalDoc(!!doc);
  //         } catch (error) {
  //           console.error("Failed to check topic approval doc:", error);
  //           // setTopicApprovalDoc(null);
  //           // setHasTopicApprovalDoc(false);
  //         }

  //         // Load review rollouts
  //         try {
  //           const review1Rollout = await reviewsApi.getRollout("review_1");
  //           const review2Rollout = await reviewsApi.getRollout("review_2");
  //           const finalReviewRollout =
  //             await reviewsApi.getRollout("final_review");

  //           // setReview1RolledOut(!!review1Rollout?.isActive);
  //           // setReview2RolledOut(!!review2Rollout?.isActive);
  //           // setFinalReviewRolledOut(!!finalReviewRollout?.isActive);
  //         } catch (error) {
  //           console.error("Failed to load review rollouts:", error);
  //           // setReview1RolledOut(false);
  //           // setReview2RolledOut(false);
  //           // setFinalReviewRolledOut(false);
  //         }

  //         // Load review sessions for this group
  //         try {
  //           const [r1Session, r2Session, frSession] = await Promise.all([
  //             reviewsApi
  //               .getSessionByGroupId("review_1", group.id)
  //               .catch(() => null),
  //             reviewsApi
  //               .getSessionByGroupId("review_2", group.id)
  //               .catch(() => null),
  //             reviewsApi
  //               .getSessionByGroupId("final_review", group.id)
  //               .catch(() => null),
  //           ]);

  //           setReview1Session(r1Session);
  //           setReview2Session(r2Session);
  //           setFinalReviewSession(frSession);

  //           // Load messages for each session
  //           if (r1Session) {
  //             const msgs = await reviewsApi
  //               .getMessagesBySession(r1Session.id)
  //               .catch(() => []);
  //             // setReview1Messages(msgs);
  //           } else {
  //             // setReview1Messages([]);
  //           }
  //           if (r2Session) {
  //             const msgs = await reviewsApi
  //               .getMessagesBySession(r2Session.id)
  //               .catch(() => []);
  //             // setReview2Messages(msgs);
  //           } else {
  //             // setReview2Messages([]);
  //           }
  //           if (frSession) {
  //             const msgs = await reviewsApi
  //               .getMessagesBySession(frSession.id)
  //               .catch(() => []);
  //             // setFinalReviewMessages(msgs);
  //           } else {
  //             // setFinalReviewMessages([]);
  //           }
  //         } catch (error) {
  //           console.error("Failed to load review sessions:", error);
  //           setReview1Session(null);
  //           setReview2Session(null);
  //           setFinalReviewSession(null);
  //           // setReview1Messages([]);
  //           // setReview2Messages([]);
  //           // setFinalReviewMessages([]);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Failed to load team data:", error);
  //       showToast("Failed to load team data", "error");
  //     }
  //   },
  //   [showToast],
  // );

  const openTeamDialog = (team: TeamProgress) => {
    router.push(`/dashboard/faculty/team/${team.groupId}?tab=topic`);
  };

  // const closeTeamView = () => {
  //   setSelectedTeam(null);
  //   setSelectedGroup(null);
  //   setShowEmbeddedEvaluation(false);
  //   setEvaluationSessionId("");
  // };

  // const refreshTeamData = () => {
  //   if (selectedTeam) {
  //     loadTeamData(selectedTeam);
  //     loadAllocations();
  //   }
  //   showToast("Data refreshed", "info");
  // };

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

  return (
    <DashboardLayout title="Faculty Dashboard">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation for Super Admins */}
        {profile?.role === "super_admin" && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/admin")}
              size="sm"
            >
              Back to Admin Dashboard
            </Button>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleRefresh}
            size="sm"
            disabled={initialLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${initialLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Loading Skeleton */}
        {initialLoading ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
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
            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {acceptedTeams.length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">My Teams</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">
                      {pendingRequests.length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Pending Requests
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {rejectedRequests.length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Rejected Requests
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {allocations.length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Total Requests</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* My Teams Section */}
            {acceptedTeams.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>My Teams</CardTitle>
                  {availableSemesters.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <select
                        value={semesterFilter ?? ""}
                        onChange={(e) =>
                          setSemesterFilter(
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">All Semesters</option>
                        {availableSemesters.map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredAcceptedTeams.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">
                        No teams found for Semester {semesterFilter}
                      </p>
                    ) : (
                      filteredAcceptedTeams.map((allocation) => (
                        <div
                          key={allocation.id}
                          className="border-2 border-green-200 bg-green-50 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {allocation.group?.groupId || "Unknown Group"}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Team Code: {allocation.group?.teamCode}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                                <Check className="h-3 w-3 inline mr-1" />
                                Accepted
                              </span>
                              <p className="text-xs text-gray-600 mt-1">
                                {getPreferenceLabel(allocation.preferenceRank)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Team Members:
                            </p>
                            <div className="space-y-1">
                              {allocation.members?.map((member) => (
                                <div
                                  key={member.id}
                                  className="text-sm text-gray-600"
                                >
                                  • {member.name} ({member.rollNumber})
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Progress Section */}
            {filteredTeamProgress.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Project Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredTeamProgress.map((team) => (
                      <div
                        key={team.groupId}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">
                              {team.groupDisplayId}
                            </h4>
                            {team.topicApproval.approvedTopic && (
                              <p className="text-sm text-gray-600 truncate max-w-[300px]">
                                {team.topicApproval.approvedTopic}
                              </p>
                            )}
                          </div>
                          {/* <DeleteTeamButton groupId={team.groupId} /> */}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTeamDialog(team)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </div>

                        {/* Progress Indicators */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center">
                            <Badge
                              variant={
                                team.topicApproval.status === "approved"
                                  ? "success"
                                  : team.topicApproval.totalTopicsSubmitted > 0
                                    ? "warning"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              Topic
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {team.topicApproval.status === "approved"
                                ? "✓"
                                : team.topicApproval.totalTopicsSubmitted > 0
                                  ? `${team.topicApproval.totalTopicsSubmitted} pending`
                                  : "—"}
                            </p>
                          </div>
                          <div className="text-center">
                            <Badge
                              variant={
                                team.review1.status === "completed"
                                  ? "success"
                                  : team.review1.status !== "not_started"
                                    ? "warning"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              R1
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {team.review1.status === "completed"
                                ? "✓"
                                : team.review1.progressPercentage
                                  ? `${team.review1.progressPercentage}%`
                                  : team.review1.isRolledOut
                                    ? "0%"
                                    : "🔒"}
                            </p>
                          </div>
                          <div className="text-center">
                            <Badge
                              variant={
                                team.review2.status === "completed"
                                  ? "success"
                                  : team.review2.status !== "not_started"
                                    ? "warning"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              R2
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {team.review2.status === "completed"
                                ? "✓"
                                : team.review2.progressPercentage
                                  ? `${team.review2.progressPercentage}%`
                                  : team.review2.isRolledOut
                                    ? "0%"
                                    : "🔒"}
                            </p>
                          </div>
                          <div className="text-center">
                            <Badge
                              variant={
                                team.finalReview.status === "completed"
                                  ? "success"
                                  : team.finalReview.status !== "not_started"
                                    ? "warning"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              Final
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {team.finalReview.status === "completed"
                                ? "✓"
                                : team.finalReview.progressPercentage
                                  ? `${team.finalReview.progressPercentage}%`
                                  : team.finalReview.isRolledOut
                                    ? "0%"
                                    : "🔒"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending Requests Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Pending Requests{" "}
                  {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>
                      {allocations.length === 0
                        ? "No teams have selected you as a mentor yet"
                        : "No pending requests"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {allocation.group?.groupId || "Unknown Group"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Team Code: {allocation.group?.teamCode}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                allocation.status,
                              )}`}
                            >
                              {allocation.status.charAt(0).toUpperCase() +
                                allocation.status.slice(1)}
                            </span>
                            <p className="text-xs text-gray-600 mt-1">
                              {getPreferenceLabel(allocation.preferenceRank)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Team Members:
                          </p>
                          <div className="space-y-1">
                            {allocation.members?.map((member) => (
                              <div
                                key={member.id}
                                className="text-sm text-gray-600"
                              >
                                • {member.name} ({member.rollNumber})
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAccept(allocation.id)}
                            disabled={loading}
                            size="sm"
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Accept Team
                          </Button>
                          <Button
                            onClick={() => handleReject(allocation.id)}
                            disabled={loading}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  Unavailable Requests{" "}
                  {waitingRequests.length > 0 && `(${waitingRequests.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {waitingRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>
                      {allocations.length === 0
                        ? "No teams have selected you as a mentor yet"
                        : "No unavailable requests"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {waitingRequests.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {allocation.group?.groupId || "Unknown Group"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Team Code: {allocation.group?.teamCode}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                allocation.status,
                              )}`}
                            >
                              {allocation.status.charAt(0).toUpperCase() +
                                allocation.status.slice(1)}
                            </span>
                            <p className="text-xs text-gray-600 mt-1">
                              {getPreferenceLabel(allocation.preferenceRank)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Team Members:
                          </p>
                          <div className="space-y-1">
                            {allocation.members?.map((member) => (
                              <div
                                key={member.id}
                                className="text-sm text-gray-600"
                              >
                                • {member.name} ({member.rollNumber})
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* <div className="flex gap-2">
                      <Button
                        onClick={() => handleAccept(allocation.id)}
                        disabled={loading}
                        size="sm"
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept Team
                      </Button>
                      <Button
                        onClick={() => handleReject(allocation.id)}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div> */}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Team details now open on dedicated route: /dashboard/faculty/team/[groupId] */}

      {/* Keep dialog state variable for compatibility, but UI now embedded in R1/R2 tabs */}
    </DashboardLayout>
  );
}
