"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  UserPlus,
  FileText,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  groupApi,
  profileApi,
  mentorFormApi,
  mentorPreferenceApi,
  mentorAllocationApi,
  projectTopicsApi,
  GroupWithMembers,
} from "@/lib/api";
import { Profile } from "@/types";
import {
  getCachedData,
  setCachedData,
  invalidateCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";

interface MentorStatusInfo {
  mentorName: string;
  status: string;
  currentPriority?: number;
}

interface StudentDashboardData {
  group: GroupWithMembers | null;
  members: Profile[];
  mentorFormActive: boolean;
  hasSubmittedPreferences: boolean;
  mentorStatus: MentorStatusInfo | null;
  mentorSelected: any[];
  hasApprovedTopic: boolean;
}

const EMPTY_DASHBOARD_DATA: StudentDashboardData = {
  group: null,
  members: [],
  mentorFormActive: false,
  hasSubmittedPreferences: false,
  mentorStatus: null,
  mentorSelected: [],
  hasApprovedTopic: false,
};

export default function StudentDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mentorFormActive, setMentorFormActive] = useState(false);
  const [hasSubmittedPreferences, setHasSubmittedPreferences] = useState(false);
  const [mentorStatus, setMentorStatus] = useState<MentorStatusInfo | null>(null);
  const [mentorSelected, setMentorSelected] = useState<any[]>([]);
  const [hasApprovedTopic, setHasApprovedTopic] = useState(false);

  // Applies a full snapshot of dashboard data in one go, so React batches it
  // into a single render - the group card, mentor section, and progress
  // section all appear together instead of popping in one at a time as each
  // request resolves.
  const applyData = useCallback((data: StudentDashboardData) => {
    setGroup(data.group);
    setMembers(data.members);
    setMentorFormActive(data.mentorFormActive);
    setHasSubmittedPreferences(data.hasSubmittedPreferences);
    setMentorStatus(data.mentorStatus);
    setMentorSelected(data.mentorSelected);
    setHasApprovedTopic(data.hasApprovedTopic);
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!user || !profile) {
      router.push("/auth/login");
      return;
    }

    if (profile.role !== "student") {
      router.push("/dashboard");
      return;
    }

    loadGroupData();
  }, [user, profile, router, authLoading]);

  const loadGroupData = useCallback(
    async (forceRefresh = false) => {
      if (!profile) return;

      if (!forceRefresh) {
        // Show cached data immediately (if any) so we're never rendering an
        // empty/default state for content the user has already seen -
        // whatever we show now will be fully consistent, and gets replaced
        // atomically once the fresh data below lands.
        const cached = getCachedData<StudentDashboardData>(CACHE_KEYS.MY_GROUP);
        if (cached) {
          applyData(cached);
          setInitialLoading(false);
        }
      } else {
        setRefreshing(true);
      }

      try {
        const userGroup = await groupApi.getMyGroup();

        if (!userGroup) {
          applyData(EMPTY_DASHBOARD_DATA);
          invalidateCache(CACHE_KEYS.MY_GROUP);
          return;
        }

        // Everything below is independent of everything else - fetch it all
        // concurrently instead of one-at-a-time (was the main source of
        // slow dashboard loads).
        const [activeForm, prefResponse, status, topics] = await Promise.all([
          mentorFormApi.getActive(),
          mentorPreferenceApi.hasSubmitted(),
          mentorAllocationApi.getStatus(),
          projectTopicsApi.getMyGroupTopics().catch((error) => {
            console.error("Failed to load topics:", error);
            return [];
          }),
        ]);

        let mentorSelected: any[] = [];
        if (prefResponse.hasSubmitted) {
          try {
            const allocations = await mentorAllocationApi.getForGroup();
            const mentors = await profileApi.getBatch(
              allocations.map((a) => a.mentorId),
            );
            const mentorsById = new Map(mentors.map((m) => [m.id, m]));
            mentorSelected = allocations.map((allocation) => ({
              ...allocation,
              mentorName: mentorsById.get(allocation.mentorId)?.name ?? "",
            }));
          } catch (error) {
            console.error("Failed to fetch mentors:", error);
          }
        }

        const mentorStatus: MentorStatusInfo | null =
          status.status === "accepted" && status.mentorName
            ? { mentorName: status.mentorName, status: "Accepted" }
            : status.status === "pending"
              ? {
                  mentorName: "",
                  status: "Pending",
                  currentPriority: status.currentPriority,
                }
              : null;

        const nextData: StudentDashboardData = {
          group: userGroup,
          members: userGroup.members?.map((m) => m.profile) ?? [],
          mentorFormActive: !!activeForm,
          hasSubmittedPreferences: prefResponse.hasSubmitted,
          hasApprovedTopic: topics.some((t) => t.status === "approved"),
          mentorStatus,
          mentorSelected,
        };

        // Apply everything together so the group card, mentor section, and
        // progress section all appear/update in the same render instead of
        // popping in one at a time.
        applyData(nextData);
        setCachedData(CACHE_KEYS.MY_GROUP, nextData, CACHE_TTL.MEDIUM);
      } catch (error: any) {
        console.error("Failed to load group data:", error);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [profile, applyData],
  );

  const handleRefresh = () => {
    invalidateCache(CACHE_KEYS.MY_GROUP);
    showToast("Refreshing data...", "info");
    loadGroupData(true);
  };

  const handleCreateGroup = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const newGroup = await groupApi.create();
      setGroup(newGroup);
      setMembers([profile]);
      showToast("Group created successfully!", "success");
      invalidateCache(CACHE_KEYS.MY_GROUP);
      await loadGroupData(true);
    } catch (error: any) {
      showToast(error.message || "Failed to create group", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      await groupApi.join({ teamCode: teamCodeInput });
      showToast("Joined group successfully!", "success");
      setShowJoinForm(false);
      setTeamCodeInput("");
      invalidateCache(CACHE_KEYS.MY_GROUP);
      await loadGroupData(true);
    } catch (error: any) {
      showToast(error.message || "Failed to join group", "error");
    } finally {
      setLoading(false);
    }
  };

  const isLeader = group && profile && group.createdBy === profile.id;

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Refresh Button */}
        {group && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleRefresh}
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        )}

        {/* Loading Skeleton - only shown before we have any data at all;
            once loaded, group/members/mentor state update together so
            there's no in-between state to render a skeleton for. */}
        {initialLoading ? (
          <div className="space-y-6">
            <CardSkeleton className="h-48" />
          </div>
        ) : !group ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Create or Join a Group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Button
                    onClick={handleCreateGroup}
                    disabled={loading}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Group
                  </Button>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Start a new project group and invite your teammates
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>

                <div>
                  {!showJoinForm ? (
                    <Button
                      onClick={() => setShowJoinForm(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Existing Group
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        placeholder="Enter Team Code (e.g., A7DXQ)"
                        value={teamCodeInput}
                        onChange={(e) =>
                          setTeamCodeInput(e.target.value.toUpperCase())
                        }
                        maxLength={5}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleJoinGroup}
                          disabled={loading || !teamCodeInput}
                          className="flex-1"
                        >
                          Join Group
                        </Button>
                        <Button
                          onClick={() => {
                            setShowJoinForm(false);
                            setTeamCodeInput("");
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Ask your team leader for the team code
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Your Group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Group ID</p>
                    <p className="text-lg font-semibold">{group.groupId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Team Code</p>
                    <p className="text-lg font-semibold text-accent">
                      {group.teamCode}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Team Members ({members.length}/3)
                  </p>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                      >
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-600">
                            {member.email}
                          </p>
                        </div>
                        {member.id === group.createdBy && (
                          <span className="px-2 py-1 bg-accent/20 text-accent text-xs font-medium rounded">
                            Leader
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {!group.isFull && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-900">
                      <strong>Share Team Code:</strong> {group.teamCode} with
                      your teammates to let them join
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mentor Allocation Section - Hide if mentor already assigned */}
            {mentorFormActive && mentorStatus?.status !== "Accepted" && (
              <Card>
                <CardHeader>
                  <CardTitle>Mentor Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasSubmittedPreferences ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        {mentorSelected.map((mentor, index) => {
                          const isRejected = mentor.status === "rejected";
                          const isWaitingOrPending =
                            mentor.status === "waiting" ||
                            mentor.status === "pending";

                          return (
                            <div
                              key={mentor.mentorId}
                              className={`flex justify-between items-center mb-2 ${
                                isRejected ? "opacity-50" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {/* Preference Badge */}
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    isRejected
                                      ? "bg-gray-200 text-gray-600"
                                      : "bg-green-200 text-green-800"
                                  }`}
                                >
                                  #{mentor.preference || index + 1}
                                </span>

                                {/* Mentor Name */}
                                <p
                                  className={`font-medium ${
                                    isRejected
                                      ? "text-gray-500 line-through"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {mentor.mentorName}
                                </p>
                              </div>

                              {/* Status Badge */}
                              {isRejected && (
                                <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                  Rejected
                                </span>
                              )}
                              {isWaitingOrPending && (
                                <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded capitalize">
                                  {mentor.status}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        <p className="text-green-900 font-medium mt-3 pt-2 border-t border-green-200">
                          ✓ Preferences Submitted
                        </p>
                      </div>
                      {mentorStatus && (
                        <div className="p-4 border border-gray-200 rounded-md">
                          <p className="text-sm text-gray-600">Status</p>
                          <p className="text-lg font-semibold">
                            {mentorStatus.status}
                          </p>
                          {mentorStatus.mentorName && (
                            <>
                              <p className="text-sm text-gray-600 mt-2">
                                Assigned Mentor
                              </p>
                              <p className="font-medium">
                                {mentorStatus.mentorName}
                              </p>
                            </>
                          )}
                          {mentorStatus.status === "Pending" &&
                            mentorStatus.currentPriority && (
                              <p className="text-sm text-blue-700 mt-2">
                                Waiting for response from your{" "}
                                {mentorStatus.currentPriority === 1
                                  ? "1st"
                                  : mentorStatus.currentPriority === 2
                                    ? "2nd"
                                    : "3rd"}{" "}
                                choice mentor
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  ) : isLeader ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        The Mentor Allocation Form is now active. As the group
                        leader, you can submit your team's mentor preferences.
                      </p>
                      <Button
                        onClick={() =>
                          router.push("/dashboard/student/mentor-preferences")
                        }
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Fill Mentor Allocation Form
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-amber-900">
                        Only the group leader can submit mentor preferences.
                        Please wait for your leader to complete the form.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Project Progress Section - Shows after mentor is allocated */}
            {mentorStatus?.status === "Accepted" && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Project Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Your mentor has been assigned! Now you can start working
                      on your project. Submit your topic ideas and track your
                      progress through reviews.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-3 rounded-md border ${hasApprovedTopic ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
                      >
                        <p className="text-xs text-gray-600">Topic Approval</p>
                        <p
                          className={`font-medium ${hasApprovedTopic ? "text-green-700" : "text-amber-700"}`}
                        >
                          {hasApprovedTopic ? "✓ Approved" : "Pending"}
                        </p>
                      </div>
                      <div className="p-3 rounded-md border bg-gray-50 border-gray-200">
                        <p className="text-xs text-gray-600">Reviews</p>
                        <p className="font-medium text-gray-700">
                          {hasApprovedTopic
                            ? "In Progress"
                            : "After Topic Approval"}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() =>
                        router.push("/dashboard/student/project-progress")
                      }
                      className="w-full"
                    >
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Open Project Progress
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
